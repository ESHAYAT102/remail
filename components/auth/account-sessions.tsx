"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { MAX_DEVICE_ACCOUNTS } from "@/lib/auth-policy";
import type { SessionUser } from "@/lib/session";
import { Menu } from "@/components/ui/menu";
import { Icons } from "@/components/ui/icons";

type AccountSession = {
  token: string;
  user: SessionUser;
};

type LoadState = "loading" | "ready" | "error";

type AccountSessionsContextValue = {
  currentUser: SessionUser;
  demoMode: boolean;
  sessions: AccountSession[];
  loadState: LoadState;
  busyToken: string | null;
  reload: () => Promise<void>;
  switchTo: (session: AccountSession) => Promise<void>;
};

const AccountSessionsContext = createContext<AccountSessionsContextValue | null>(
  null,
);

export function AccountSessionsProvider({
  currentUser,
  demoMode,
  children,
}: {
  currentUser: SessionUser;
  demoMode: boolean;
  children: React.ReactNode;
}) {
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(
    demoMode ? "ready" : "loading",
  );
  const [busyToken, setBusyToken] = useState<string | null>(null);
  const [switchError, setSwitchError] = useState("");

  const reload = useCallback(async () => {
    if (demoMode) {
      setSessions([]);
      setLoadState("ready");
      return;
    }

    setLoadState("loading");
    const preserved = await fetch(
      "/api/auth/multi-session/preserve-current",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      },
    ).catch(() => null);
    if (!preserved?.ok) {
      setLoadState("error");
      return;
    }

    const result = await authClient.multiSession.listDeviceSessions();
    if (result.error) {
      setLoadState("error");
      return;
    }

    setSessions(
      (result.data ?? [])
        .filter((item) => item.user.id !== currentUser.id)
        .map((item) => ({
          token: item.session.token,
          user: {
            id: item.user.id,
            name: item.user.name,
            email: item.user.email,
            image: item.user.image,
          },
        })),
    );
    setLoadState("ready");
  }, [currentUser.id, demoMode]);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  const switchTo = useCallback(async (session: AccountSession) => {
    setBusyToken(session.token);
    setSwitchError("");
    const result = await authClient.multiSession.setActive({
      sessionToken: session.token,
    });
    if (result.error) {
      setBusyToken(null);
      setSwitchError(
        "Unable to switch accounts. Select the account and try again.",
      );
      return;
    }
    window.location.replace("/mail");
  }, []);

  const value = useMemo<AccountSessionsContextValue>(
    () => ({
      currentUser,
      demoMode,
      sessions,
      loadState,
      busyToken,
      reload,
      switchTo,
    }),
    [busyToken, currentUser, demoMode, loadState, reload, sessions, switchTo],
  );

  return (
    <AccountSessionsContext.Provider value={value}>
      {children}
      <span className="sr-only" role="alert">
        {switchError}
      </span>
    </AccountSessionsContext.Provider>
  );
}

function useAccountSessions() {
  const value = useContext(AccountSessionsContext);
  if (!value) {
    throw new Error("Account session controls require AccountSessionsProvider.");
  }
  return value;
}

export function AccountSessionMenuGroup() {
  const router = useRouter();
  const {
    currentUser,
    demoMode,
    sessions,
    loadState,
    busyToken,
    reload,
    switchTo,
  } = useAccountSessions();
  const atLimit = sessions.length + 1 >= MAX_DEVICE_ACCOUNTS;

  return (
    <Menu.Group>
      <Menu.GroupLabel>Remail accounts</Menu.GroupLabel>
      <Menu.Item aria-current="true">
        <Menu.Icon>
          <Icons.sender size={16} />
        </Menu.Icon>
        <Menu.Label>{currentUser.email}</Menu.Label>
        <Menu.Trailing>
          <Icons.check size={14} />
        </Menu.Trailing>
      </Menu.Item>
      {sessions.map((session) => (
        <Menu.Item
          key={session.user.id}
          disabled={busyToken !== null}
          onClick={() => void switchTo(session)}
        >
          <Menu.Icon>
            <Icons.sender size={16} />
          </Menu.Icon>
          <Menu.Label>{session.user.email}</Menu.Label>
          {busyToken === session.token ? (
            <Menu.Trailing>Switching…</Menu.Trailing>
          ) : null}
        </Menu.Item>
      ))}
      {!demoMode && loadState === "loading" ? (
        <Menu.Item disabled>
          <Menu.Icon>
            <Icons.refresh size={16} />
          </Menu.Icon>
          <Menu.Label>Preparing account switcher…</Menu.Label>
        </Menu.Item>
      ) : null}
      {!demoMode && loadState === "error" ? (
        <Menu.Item onClick={() => void reload()}>
          <Menu.Icon>
            <Icons.refresh size={16} />
          </Menu.Icon>
          <Menu.Label>Retry loading accounts</Menu.Label>
        </Menu.Item>
      ) : null}
      {!demoMode && loadState === "ready" ? (
        <Menu.Item
          disabled={atLimit}
          onClick={() => router.push("/?add=account")}
        >
          <Menu.Icon>
            <Icons.add size={16} />
          </Menu.Icon>
          <Menu.Label>
            {atLimit ? "Account limit reached" : "Add account"}
          </Menu.Label>
        </Menu.Item>
      ) : null}
    </Menu.Group>
  );
}

export function AccountSignOutMenuItem({
  onSignOut,
}: {
  onSignOut: () => void;
}) {
  const { demoMode } = useAccountSessions();
  return (
    <Menu.Item onClick={onSignOut}>
      <Menu.Icon>
        <Icons.logout size={16} />
      </Menu.Icon>
      <Menu.Label>
        {demoMode ? "Sign out" : "Sign out all accounts"}
      </Menu.Label>
    </Menu.Item>
  );
}
