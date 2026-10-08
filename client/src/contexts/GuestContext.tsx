import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const GUEST_NAME_KEY = "bar_guest_name";
const GUEST_TOKEN_KEY = "bar_guest_token";

// 简单的唯一 ID 生成（兼容所有浏览器环境）
function generateToken() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return 'g_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

type GuestContextType = {
  guestName: string;
  guestToken: string;
  hasName: boolean;
  setGuestName: (name: string) => void;
  clearGuest: () => void;
};

const GuestContext = createContext<GuestContextType>({
  guestName: "",
  guestToken: "",
  hasName: false,
  setGuestName: () => {},
  clearGuest: () => {},
});

export function GuestProvider({ children }: { children: ReactNode }) {
  const [guestName, setGuestNameState] = useState<string>("");
  const [guestToken, setGuestToken] = useState<string>("");

  useEffect(() => {
    const storedName = localStorage.getItem(GUEST_NAME_KEY) || "";
    let storedToken = localStorage.getItem(GUEST_TOKEN_KEY) || "";
    if (!storedToken) {
      storedToken = generateToken();
      localStorage.setItem(GUEST_TOKEN_KEY, storedToken);
    }
    setGuestNameState(storedName);
    setGuestToken(storedToken);
  }, []);

  const setGuestName = useCallback((name: string) => {
    const trimmed = name.trim();
    localStorage.setItem(GUEST_NAME_KEY, trimmed);
    setGuestNameState(trimmed);
  }, []);

  const clearGuest = useCallback(() => {
    localStorage.removeItem(GUEST_NAME_KEY);
    const newToken = generateToken();
    localStorage.setItem(GUEST_TOKEN_KEY, newToken);
    setGuestNameState("");
    setGuestToken(newToken);
  }, []);

  return (
    <GuestContext.Provider
      value={{
        guestName,
        guestToken,
        hasName: guestName.length > 0,
        setGuestName,
        clearGuest,
      }}
    >
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest() {
  return useContext(GuestContext);
}
