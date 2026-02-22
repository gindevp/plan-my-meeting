export type MeetingType = 'offline' | 'online' | 'hybrid';
export type MeetingStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
export type MeetingLevel = 'company' | 'department' | 'team';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';
export type UserRole = 'admin' | 'employee' | 'secretary' | 'room_manager';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  position: string;
  avatar?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  floor: string;
  equipment: string[];
  status: 'available' | 'occupied' | 'maintenance';
  image?: string;
}

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  level: MeetingLevel;
  status: MeetingStatus;
  startTime: string;
  endTime: string;
  roomId?: string;
  roomName?: string;
  meetingLink?: string;
  organizer: string;
  chairperson: string;
  department: string;
  description: string;
  attendees: string[];
  agenda: AgendaItem[];
}

export interface AgendaItem {
  order: number;
  title: string;
  presenter: string;
  duration: number;
}

export interface MeetingTask {
  id: string;
  meetingId: string;
  title: string;
  assignee: string;
  deadline: string;
  status: TaskStatus;
}

export const users: User[] = [
  { id: '1', name: 'Nguyễn Văn An', email: 'an.nv@company.com', role: 'admin', department: 'IT', position: 'Giám đốc CNTT' },
  { id: '2', name: 'Trần Thị Bình', email: 'binh.tt@company.com', role: 'employee', department: 'Kinh doanh', position: 'Trưởng phòng' },
  { id: '3', name: 'Lê Hoàng Cường', email: 'cuong.lh@company.com', role: 'secretary', department: 'Hành chính', position: 'Văn thư' },
  { id: '4', name: 'Phạm Minh Đức', email: 'duc.pm@company.com', role: 'room_manager', department: 'Hành chính', position: 'Quản lý phòng họp' },
  { id: '5', name: 'Hoàng Thị Em', email: 'em.ht@company.com', role: 'employee', department: 'Nhân sự', position: 'Nhân viên' },
  { id: '6', name: 'Võ Thanh Phong', email: 'phong.vt@company.com', role: 'employee', department: 'Tài chính', position: 'Kế toán trưởng' },
];

export const rooms: Room[] = [
  { id: 'r1', name: 'Phòng họp Hội đồng', capacity: 30, floor: 'Tầng 10', equipment: ['Máy chiếu', 'Hệ thống âm thanh', 'Camera hội nghị', 'Bảng trắng'], status: 'available' },
  { id: 'r2', name: 'Phòng họp Sáng tạo', capacity: 12, floor: 'Tầng 5', equipment: ['TV 65"', 'Webcam', 'Bảng trắng'], status: 'available' },
  { id: 'r3', name: 'Phòng họp Nhanh A', capacity: 6, floor: 'Tầng 3', equipment: ['TV 55"', 'Webcam'], status: 'occupied' },
  { id: 'r4', name: 'Phòng họp Nhanh B', capacity: 6, floor: 'Tầng 3', equipment: ['TV 55"', 'Webcam'], status: 'available' },
  { id: 'r5', name: 'Phòng họp Đào tạo', capacity: 50, floor: 'Tầng 1', equipment: ['Máy chiếu', 'Hệ thống âm thanh', 'Micro không dây', 'Camera hội nghị'], status: 'maintenance' },
];

export const meetings: Meeting[] = [
  {
    id: 'm1', title: 'Họp Ban lãnh đạo Q1/2026', type: 'offline', level: 'company', status: 'approved',
    startTime: '2026-02-23T08:30:00', endTime: '2026-02-23T11:00:00',
    roomId: 'r1', roomName: 'Phòng họp Hội đồng',
    organizer: 'Nguyễn Văn An', chairperson: 'Nguyễn Văn An', department: 'Ban Giám đốc',
    description: 'Đánh giá kết quả kinh doanh Q1 và kế hoạch Q2',
    attendees: ['Nguyễn Văn An', 'Trần Thị Bình', 'Võ Thanh Phong'],
    agenda: [
      { order: 1, title: 'Báo cáo doanh thu Q1', presenter: 'Trần Thị Bình', duration: 30 },
      { order: 2, title: 'Báo cáo tài chính', presenter: 'Võ Thanh Phong', duration: 30 },
      { order: 3, title: 'Kế hoạch Q2', presenter: 'Nguyễn Văn An', duration: 45 },
    ],
  },
  {
    id: 'm2', title: 'Kickoff dự án CRM mới', type: 'hybrid', level: 'department', status: 'approved',
    startTime: '2026-02-23T14:00:00', endTime: '2026-02-23T15:30:00',
    roomId: 'r2', roomName: 'Phòng họp Sáng tạo', meetingLink: 'https://meet.company.com/crm-kickoff',
    organizer: 'Nguyễn Văn An', chairperson: 'Nguyễn Văn An', department: 'IT',
    description: 'Khởi động dự án CRM mới cho năm 2026',
    attendees: ['Nguyễn Văn An', 'Hoàng Thị Em', 'Trần Thị Bình'],
    agenda: [
      { order: 1, title: 'Giới thiệu dự án', presenter: 'Nguyễn Văn An', duration: 20 },
      { order: 2, title: 'Phân tích yêu cầu', presenter: 'Hoàng Thị Em', duration: 30 },
    ],
  },
  {
    id: 'm3', title: 'Standup hàng tuần - Team Dev', type: 'online', level: 'team', status: 'approved',
    startTime: '2026-02-24T09:00:00', endTime: '2026-02-24T09:30:00',
    meetingLink: 'https://meet.company.com/standup-dev',
    organizer: 'Nguyễn Văn An', chairperson: 'Nguyễn Văn An', department: 'IT',
    description: 'Cập nhật tiến độ công việc hàng tuần',
    attendees: ['Nguyễn Văn An', 'Hoàng Thị Em'],
    agenda: [{ order: 1, title: 'Cập nhật tiến độ', presenter: 'Tất cả', duration: 30 }],
  },
  {
    id: 'm4', title: 'Review ngân sách 2026', type: 'offline', level: 'company', status: 'pending',
    startTime: '2026-02-25T09:00:00', endTime: '2026-02-25T11:00:00',
    roomId: 'r1', roomName: 'Phòng họp Hội đồng',
    organizer: 'Võ Thanh Phong', chairperson: 'Nguyễn Văn An', department: 'Tài chính',
    description: 'Xem xét và phê duyệt ngân sách năm 2026',
    attendees: ['Nguyễn Văn An', 'Võ Thanh Phong', 'Trần Thị Bình'],
    agenda: [
      { order: 1, title: 'Tổng quan ngân sách', presenter: 'Võ Thanh Phong', duration: 45 },
      { order: 2, title: 'Phân bổ theo phòng ban', presenter: 'Võ Thanh Phong', duration: 30 },
    ],
  },
  {
    id: 'm5', title: 'Đào tạo quy trình mới', type: 'hybrid', level: 'company', status: 'draft',
    startTime: '2026-02-26T13:30:00', endTime: '2026-02-26T16:00:00',
    roomId: 'r5', roomName: 'Phòng họp Đào tạo', meetingLink: 'https://meet.company.com/training',
    organizer: 'Lê Hoàng Cường', chairperson: 'Trần Thị Bình', department: 'Hành chính',
    description: 'Đào tạo quy trình làm việc mới cho toàn công ty',
    attendees: ['Trần Thị Bình', 'Lê Hoàng Cường', 'Hoàng Thị Em'],
    agenda: [],
  },
  {
    id: 'm6', title: 'Phỏng vấn ứng viên Senior Dev', type: 'online', level: 'department', status: 'approved',
    startTime: '2026-02-24T14:00:00', endTime: '2026-02-24T15:00:00',
    meetingLink: 'https://meet.company.com/interview-001',
    organizer: 'Hoàng Thị Em', chairperson: 'Nguyễn Văn An', department: 'Nhân sự',
    description: 'Phỏng vấn vòng 2 ứng viên Senior Developer',
    attendees: ['Nguyễn Văn An', 'Hoàng Thị Em'],
    agenda: [
      { order: 1, title: 'Technical interview', presenter: 'Nguyễn Văn An', duration: 40 },
      { order: 2, title: 'Culture fit', presenter: 'Hoàng Thị Em', duration: 20 },
    ],
  },
];

export const tasks: MeetingTask[] = [
  { id: 't1', meetingId: 'm1', title: 'Chuẩn bị slide báo cáo doanh thu', assignee: 'Trần Thị Bình', deadline: '2026-02-22', status: 'completed' },
  { id: 't2', meetingId: 'm1', title: 'Tổng hợp số liệu tài chính', assignee: 'Võ Thanh Phong', deadline: '2026-02-22', status: 'in_progress' },
  { id: 't3', meetingId: 'm2', title: 'Chuẩn bị tài liệu yêu cầu CRM', assignee: 'Hoàng Thị Em', deadline: '2026-02-22', status: 'not_started' },
  { id: 't4', meetingId: 'm4', title: 'Lập bảng ngân sách chi tiết', assignee: 'Võ Thanh Phong', deadline: '2026-02-24', status: 'in_progress' },
  { id: 't5', meetingId: 'm5', title: 'Soạn tài liệu đào tạo', assignee: 'Lê Hoàng Cường', deadline: '2026-02-25', status: 'not_started' },
];

export const departments = ['Ban Giám đốc', 'IT', 'Kinh doanh', 'Tài chính', 'Nhân sự', 'Hành chính', 'Marketing'];
export const meetingTypes: { value: MeetingType; label: string }[] = [
  { value: 'offline', label: 'Trực tiếp' },
  { value: 'online', label: 'Trực tuyến' },
  { value: 'hybrid', label: 'Kết hợp' },
];
export const meetingLevels: { value: MeetingLevel; label: string }[] = [
  { value: 'company', label: 'Tổng công ty' },
  { value: 'department', label: 'Phòng ban' },
  { value: 'team', label: 'Nhóm/Team' },
];
export const statusLabels: Record<MeetingStatus, string> = {
  draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Hủy', completed: 'Hoàn thành',
};
export const typeLabels: Record<MeetingType, string> = {
  offline: 'Trực tiếp', online: 'Trực tuyến', hybrid: 'Kết hợp',
};
export const levelLabels: Record<MeetingLevel, string> = {
  company: 'Tổng công ty', department: 'Phòng ban', team: 'Nhóm/Team',
};
