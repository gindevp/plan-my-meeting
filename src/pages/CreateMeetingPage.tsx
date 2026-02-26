import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { MeetingType, MeetingLevel } from "@/data/mockData";
import { meetingTypes as mockTypes, meetingLevels as mockLevels } from "@/data/mockData";
import { useRooms } from "@/hooks/useRooms";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { createMeetingFromForm, submitMeeting } from "@/services/api/meetings";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Send, Save, RotateCcw, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AgendaForm {
  title: string;
  presenter: string;
  duration: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export default function CreateMeetingPage() {
  const { toast } = useToast();
  const { user: account } = useAuth();
  const navigate = useNavigate();
  const { data: rooms = [] } = useRooms();
  const { data: users = [] } = useUsers();
  const meetingTypes = mockTypes;
  const meetingLevels = mockLevels;
  const [step, setStep] = useState(1);
  const [meetingType, setMeetingType] = useState<MeetingType>("offline");
  const [meetingLevel, setMeetingLevel] = useState<MeetingLevel>("department");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [chairpersonId, setChairpersonId] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [agendaItems, setAgendaItems] = useState<AgendaForm[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [attendeeSearch, setAttendeeSearch] = useState("");

  const steps = [
    { num: 1, label: "Thông tin chung" },
    { num: 2, label: "Thành phần tham dự" },
    { num: 3, label: "Chương trình họp" },
  ];

  const validateStep1 = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!title.trim()) newErrors.title = "Vui lòng nhập tiêu đề";
    if (!startDate) newErrors.startDate = "Vui lòng chọn ngày";
    if (!startTime) newErrors.startTime = "Vui lòng chọn giờ bắt đầu";
    if (!endTime) newErrors.endTime = "Vui lòng chọn giờ kết thúc";
    if (!chairpersonId) newErrors.chairperson = "Vui lòng chọn người chủ trì";
    if ((meetingType === "offline" || meetingType === "hybrid") && !selectedRoom)
      newErrors.room = "Vui lòng chọn phòng họp";
    if ((meetingType === "online" || meetingType === "hybrid") && !meetingLink.trim())
      newErrors.meetingLink = "Vui lòng nhập link họp";

    if (startDate && startTime && endTime) {
      const start = new Date(`${startDate}T${startTime}:00`);
      const end = new Date(`${startDate}T${endTime}:00`);
      if (end <= start) {
        newErrors.timeRange = "Giờ kết thúc phải sau giờ bắt đầu";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (selectedAttendees.length === 0)
      newErrors.attendees = "Vui lòng chọn ít nhất 1 người tham dự";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (agendaItems.length === 0)
      newErrors.agenda = "Vui lòng tạo ít nhất 1 mục chương trình họp";
    agendaItems.forEach((item, i) => {
      if (!item.title.trim()) newErrors[`agenda_title_${i}`] = "Nhập tên nội dung";
      if (!item.presenter) newErrors[`agenda_presenter_${i}`] = "Chọn người trình bày";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkConflicts = () => {
    const found: string[] = [];
    if (selectedRoom) {
      const room = rooms.find((r) => r.id === selectedRoom);
      if (room?.status === "occupied") found.push(`Phòng ${room.name} đang được sử dụng`);
      if (room?.status === "maintenance") found.push(`Phòng ${room.name} đang bảo trì`);
      if (room && selectedAttendees.length > room.capacity)
        found.push(`Số người tham dự (${selectedAttendees.length}) vượt sức chứa phòng (${room.capacity})`);
    }
    setConflicts(found);
  };

  const goToStep = (targetStep: number) => {
    if (targetStep > step) {
      // Validate current step before advancing
      if (step === 1 && !validateStep1()) return;
      if (step === 2 && !validateStep2()) return;
    }
    setErrors({});
    checkConflicts();
    setStep(targetStep);
  };

  const toggleAttendee = (name: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
    );
    if (errors.attendees) {
      setErrors((prev) => {
        const { attendees, ...rest } = prev;
        return rest;
      });
    }
  };

  const addAgendaItem = () => {
    setAgendaItems((prev) => [...prev, { title: "", presenter: "", duration: "15" }]);
    if (errors.agenda) {
      setErrors((prev) => {
        const { agenda, ...rest } = prev;
        return rest;
      });
    }
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAgendaItem = (index: number, field: keyof AgendaForm, value: string) => {
    setAgendaItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleClearForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setStartTime("");
    setEndTime("");
    setChairperson("");
    setMeetingLink("");
    setSelectedRoom("");
    setMeetingType("offline");
    setMeetingLevel("department");
    setSelectedAttendees([]);
    setAgendaItems([]);
    setConflicts([]);
    setErrors({});
    setStep(1);
    toast({ title: "Đã xóa", description: "Tất cả dữ liệu đã được xóa." });
  };

  const handleSaveDraft = async () => {
    if (!validateStep1()) return;
    if (!account?.id) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không xác định được người yêu cầu (requester)." });
      return;
    }
    if (!chairpersonId) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn người chủ trì." });
      return;
    }

    try {
      await createMeetingFromForm({
        title,
        description,
        startDate,
        startTime,
        endTime,
        meetingType,
        meetingLevel,
        selectedRoomId: selectedRoom || undefined,
        meetingLink,
        requesterId: account.id,
        hostId: chairpersonId,
      });
      setTitle("");
      setDescription("");
      setStartDate("");
      setStartTime("");
      setEndTime("");
      setSelectedRoom("");
      setMeetingLink("");
      setSelectedAttendees([]);
      setAgendaItems([]);
      setConflicts([]);
      setErrors({});
      setStep(1);
      toast({ title: "Đã lưu nháp", description: "Cuộc họp đã được lưu ở trạng thái nháp." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Lỗi lưu nháp",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    checkConflicts();
    if (!account?.id) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không xác định được người yêu cầu (requester)." });
      return;
    }
    if (!chairpersonId) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng chọn người chủ trì." });
      return;
    }

    try {
      const created = await createMeetingFromForm({
        title,
        description,
        startDate,
        startTime,
        endTime,
        meetingType,
        meetingLevel,
        selectedRoomId: selectedRoom || undefined,
        meetingLink,
        requesterId: account.id,
        hostId: chairpersonId,
      });
      if (created?.id != null) {
        await submitMeeting(created.id);
      }
      toast({
        title: "Đã gửi duyệt",
        description: "Cuộc họp đã được tạo và gửi phê duyệt.",
      });
      navigate("/plans");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Lỗi tạo cuộc họp",
        description: err instanceof Error ? err.message : "Lỗi không xác định",
      });
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  const errorClass = (field: string) => (errors[field] ? "border-destructive" : "");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Tạo cuộc họp mới</h1>
          <p className="text-sm text-muted-foreground mt-1">Điền thông tin để tạo và gửi phê duyệt cuộc họp</p>
        </div>
        <Button variant="outline" onClick={handleClearForm} className="gap-1.5">
          <RotateCcw className="h-4 w-4" /> Xóa dữ liệu
        </Button>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <button
              onClick={() => goToStep(s.num)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                step === s.num
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : step > s.num
                  ? "bg-success/15 text-success"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-bold">
                {step > s.num ? "✓" : s.num}
              </span>
              {s.label}
            </button>
            {i < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Phát hiện xung đột</p>
                <ul className="mt-1 space-y-0.5 text-xs text-destructive/80">
                  {conflicts.map((c, i) => (
                    <li key={i}>• {c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-display">Thông tin chung</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Tiêu đề cuộc họp *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nhập tiêu đề cuộc họp" className={`mt-1.5 ${errorClass("title")}`} />
              {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Hình thức họp *</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as MeetingType)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meetingTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cấp họp *</Label>
                <Select value={meetingLevel} onValueChange={(v) => setMeetingLevel(v as MeetingLevel)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {meetingLevels.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Ngày *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`mt-1.5 ${errorClass("startDate")}`} />
                {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate}</p>}
              </div>
              <div>
                <Label>Bắt đầu *</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`mt-1.5 ${errorClass("startTime")}`} />
                {errors.startTime && <p className="text-xs text-destructive mt-1">{errors.startTime}</p>}
              </div>
              <div>
                <Label>Kết thúc *</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`mt-1.5 ${errorClass("endTime")}`} />
                {errors.endTime && <p className="text-xs text-destructive mt-1">{errors.endTime}</p>}
                {errors.timeRange && <p className="text-xs text-destructive mt-1">{errors.timeRange}</p>}
              </div>
            </div>

            {(meetingType === "offline" || meetingType === "hybrid") && (
              <div>
                <Label>Phòng họp *</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger className={`mt-1.5 ${errorClass("room")}`}><SelectValue placeholder="Chọn phòng họp" /></SelectTrigger>
                  <SelectContent>
                    {rooms.map((r: { id: string; name: string; capacity: number; status: string }) => (
                      <SelectItem key={r.id} value={r.id} disabled={r.status !== "available"}>
                        {r.name} ({r.capacity} người) {r.status !== "available" ? `- ${r.status === "occupied" ? "Đang sử dụng" : "Bảo trì"}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.room && <p className="text-xs text-destructive mt-1">{errors.room}</p>}
              </div>
            )}

            {(meetingType === "online" || meetingType === "hybrid") && (
              <div>
                <Label>Link họp trực tuyến *</Label>
                <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.example.com/..." className={`mt-1.5 ${errorClass("meetingLink")}`} />
                {errors.meetingLink && <p className="text-xs text-destructive mt-1">{errors.meetingLink}</p>}
              </div>
            )}

            <div>
              <Label>Người chủ trì *</Label>
              <Select value={chairpersonId} onValueChange={setChairpersonId}>
                <SelectTrigger className={`mt-1.5 ${errorClass("chairperson")}`}><SelectValue placeholder="Chọn người chủ trì" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {(u.name || u.login) + (u.position ? ` - ${u.position}` : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.chairperson && <p className="text-xs text-destructive mt-1">{errors.chairperson}</p>}
            </div>

            <div>
              <Label>Nội dung, mục tiêu</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả nội dung và mục tiêu cuộc họp" className="mt-1.5" rows={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card className="shadow-card animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base font-display">Thành phần tham dự</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {errors.attendees && (
              <p className="text-sm text-destructive font-medium">{errors.attendees}</p>
            )}

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm người tham dự theo tên..."
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => toggleAttendee(u.name || u.login)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${
                    selectedAttendees.includes(u.name || u.login)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                    {u.name.split(" ").pop()?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-xs">{u.name || u.login}</p>
                    <p className="text-[10px] text-muted-foreground">{[u.position, u.department].filter(Boolean).join(" • ") || "—"}</p>
                  </div>
                  {selectedAttendees.includes(u.name || u.login) && (
                    <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="col-span-2 text-center text-sm text-muted-foreground py-4">Không tìm thấy người nào</p>
              )}
            </div>

            {selectedAttendees.length > 0 && (
              <div>
                <Label>Đã chọn ({selectedAttendees.length})</Label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedAttendees.map((a) => (
                    <Badge key={a} variant="secondary" className="cursor-pointer" onClick={() => toggleAttendee(a)}>
                      {a} ×
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <Card className="shadow-card animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-display">Chương trình họp (Agenda)</CardTitle>
            <Button variant="outline" size="sm" onClick={addAgendaItem}>
              <Plus className="h-4 w-4 mr-1" /> Thêm mục
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors.agenda && (
              <p className="text-sm text-destructive font-medium">{errors.agenda}</p>
            )}
            {agendaItems.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Chưa có mục nào. Nhấn "Thêm mục" để bắt đầu.
              </div>
            )}
            {agendaItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/20">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mt-1">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <div>
                    <Input
                      placeholder="Tên nội dung"
                      value={item.title}
                      onChange={(e) => updateAgendaItem(i, "title", e.target.value)}
                      className={errorClass(`agenda_title_${i}`)}
                    />
                    {errors[`agenda_title_${i}`] && <p className="text-xs text-destructive mt-1">{errors[`agenda_title_${i}`]}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Select value={item.presenter} onValueChange={(v) => updateAgendaItem(i, "presenter", v)}>
                        <SelectTrigger className={errorClass(`agenda_presenter_${i}`)}><SelectValue placeholder="Người trình bày" /></SelectTrigger>
                        <SelectContent>
                          {users.map((u) => <SelectItem key={u.id} value={u.name || u.login}>{u.name || u.login}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors[`agenda_presenter_${i}`] && <p className="text-xs text-destructive mt-1">{errors[`agenda_presenter_${i}`]}</p>}
                    </div>
                    <Input
                      type="number"
                      placeholder="Thời lượng (phút)"
                      value={item.duration}
                      onChange={(e) => updateAgendaItem(i, "duration", e.target.value)}
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => removeAgendaItem(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>
          Quay lại
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="h-4 w-4 mr-1.5" /> Lưu nháp
          </Button>
          {step < 3 ? (
            <Button onClick={() => goToStep(step + 1)}>Tiếp theo</Button>
          ) : (
            <Button onClick={handleSubmit}>
              <Send className="h-4 w-4 mr-1.5" /> Gửi duyệt
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
