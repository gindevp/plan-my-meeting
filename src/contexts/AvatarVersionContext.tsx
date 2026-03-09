import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AvatarVersionContextType {
  avatarVersion: number;
  incAvatarVersion: () => void;
}

const AvatarVersionContext = createContext<AvatarVersionContextType>({
  avatarVersion: 0,
  incAvatarVersion: () => {},
});

export function useAvatarVersion() {
  return useContext(AvatarVersionContext);
}

export function AvatarVersionProvider({ children }: { children: ReactNode }) {
  const [avatarVersion, setAvatarVersion] = useState(0);
  const incAvatarVersion = useCallback(() => setAvatarVersion((v) => v + 1), []);
  return (
    <AvatarVersionContext.Provider value={{ avatarVersion, incAvatarVersion }}>
      {children}
    </AvatarVersionContext.Provider>
  );
}
