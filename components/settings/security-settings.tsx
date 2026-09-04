"use client";

import { useEffect, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@/components/ui/button";
import { useMailShell } from "@/components/shell/app-shell";
import { describeUserAgent, type PublicSession } from "@/lib/security";
import { colors, fonts } from "@/theme/tokens.stylex";
import {
  SettingsActions,
  SettingsCard,
  SettingsField,
  SettingsPage,
  SettingsRow,
  SettingsStatus,
  ToggleSetting,
  settingsControlClass,
  settingsFormClass,
} from "./settings-ui";

const styles = stylex.create({
  sessionCopy: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  sessionTitle: {
    color: colors.text,
    fontSize: fonts.uiSize,
    lineHeight: fonts.uiLine,
    fontWeight: 500,
  },
  current: { color: colors.ok },
  sessionMeta: {
    color: colors.textFaint,
    fontSize: fonts.captionSize,
    lineHeight: fonts.captionLine,
    overflowWrap: "anywhere",
  },
});

export function SecuritySettings({ hasPassword }: { hasPassword: boolean }) {
  const { demoMode } = useMailShell();
  const [sessions, setSessions] = useState<PublicSession[]>([]);
  const [sessionsStatus, setSessionsStatus] = useState({
    message: "Loading sessions…",
    error: false,
  });
  const [sessionBusy, setSessionBusy] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ message: "", error: false });
  const [revokeOthers, setRevokeOthers] = useState(true);

  async function loadSessions() {
    const response = await fetch("/api/settings/sessions").catch(() => null);
    const json = response
      ? ((await response.json()) as { sessions?: PublicSession[]; error?: string })
      : null;
    if (!response?.ok || !json?.sessions) {
      setSessionsStatus({
        message:
          json?.error ?? "Unable to load sessions. Refresh the page to try again.",
        error: true,
      });
      return;
    }
    setSessions(json.sessions);
    setSessionsStatus({ message: "", error: false });
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/settings/sessions")
      .then(async (response) => ({
        ok: response.ok,
        json: (await response.json()) as {
          sessions?: PublicSession[];
          error?: string;
        },
      }))
      .then(({ ok, json }) => {
        if (!active) return;
        if (!ok || !json.sessions) {
          setSessionsStatus({
            message:
              json.error ?? "Unable to load sessions. Refresh the page to try again.",
            error: true,
          });
          return;
        }
        setSessions(json.sessions);
        setSessionsStatus({ message: "", error: false });
      })
      .catch(() => {
        if (active) {
          setSessionsStatus({
            message: "Unable to load sessions. Refresh the page to try again.",
            error: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const canRevokeOtherSessions =
    !demoMode && sessions.some((session) => !session.current);

  return (
    <SettingsPage
      title="Security"
      description={
        hasPassword
          ? "Change your password and review the browsers signed in to your account."
          : "Review the browsers signed in to your account."
      }
    >
      {hasPassword ? <SettingsCard title="Password">
        <form
          className={settingsFormClass.className}
          style={settingsFormClass.style}
          onSubmit={async (event) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            setPasswordBusy(true);
            setPasswordStatus({ message: "Updating password…", error: false });
            const response = await fetch("/api/settings/password", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                currentPassword: form.get("currentPassword"),
                newPassword: form.get("newPassword"),
                confirmPassword: form.get("confirmPassword"),
                revokeOtherSessions: revokeOthers,
              }),
            }).catch(() => null);
            const json = response
              ? ((await response.json()) as { error?: string })
              : null;
            setPasswordBusy(false);
            if (!response?.ok) {
              setPasswordStatus({
                message:
                  json?.error ??
                  "Unable to update the password. Check your connection and try again.",
                error: true,
              });
              return;
            }
            formElement.reset();
            setRevokeOthers(true);
            setPasswordStatus({ message: "Password updated.", error: false });
            void loadSessions();
          }}
        >
          <SettingsField label="Current password" htmlFor="current-password">
            <input
              id="current-password"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              disabled={passwordBusy}
              className={settingsControlClass.className}
              style={settingsControlClass.style}
            />
          </SettingsField>
          <SettingsField
            label="New password"
            htmlFor="new-password"
            hint="Use at least 8 characters."
          >
            <input
              id="new-password"
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={passwordBusy}
              className={settingsControlClass.className}
              style={settingsControlClass.style}
            />
          </SettingsField>
          <SettingsField
            label="Confirm new password"
            htmlFor="confirm-password"
            hint="Enter the new password again."
          >
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={passwordBusy}
              className={settingsControlClass.className}
              style={settingsControlClass.style}
            />
          </SettingsField>
          <ToggleSetting
            id="revoke-other-sessions"
            label="Sign out other sessions"
            description="Keep only this browser signed in after you change your password."
            checked={revokeOthers}
            disabled={passwordBusy}
            onChange={setRevokeOthers}
          />
          <SettingsActions>
            <SettingsStatus
              message={passwordStatus.message}
              error={passwordStatus.error}
            />
            <Button type="submit" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Update password"}
            </Button>
          </SettingsActions>
        </form>
      </SettingsCard> : null}

      <SettingsCard title="Active sessions">
        {sessions.map((session) => (
          <SettingsRow key={session.id}>
            <div {...stylex.props(styles.sessionCopy)}>
              <span
                {...stylex.props(
                  styles.sessionTitle,
                  session.current && styles.current,
                )}
              >
                {describeUserAgent(session.userAgent)}
                {session.current ? " · This session" : ""}
              </span>
              <span {...stylex.props(styles.sessionMeta)}>
                {session.ipAddress ? `${session.ipAddress} · ` : ""}
                Active {formatSessionDate(session.updatedAt)}
              </span>
            </div>
            {!session.current ? (
              <Button
                type="button"
                variant="ghost"
                disabled={sessionBusy !== null}
                onClick={async () => {
                  setSessionBusy(session.id);
                  setSessionsStatus({ message: "Signing out session…", error: false });
                  const response = await fetch("/api/settings/sessions", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: session.id }),
                  }).catch(() => null);
                  setSessionBusy(null);
                  if (!response?.ok) {
                    const json = response
                      ? ((await response.json()) as { error?: string })
                      : null;
                    setSessionsStatus({
                      message:
                        json?.error ?? "Unable to sign out this session. Try again.",
                      error: true,
                    });
                    return;
                  }
                  setSessions((current) =>
                    current.filter((item) => item.id !== session.id),
                  );
                  setSessionsStatus({ message: "Session signed out.", error: false });
                }}
              >
                {sessionBusy === session.id ? "Signing out…" : "Sign out"}
              </Button>
            ) : null}
          </SettingsRow>
        ))}
        {sessionsStatus.message || canRevokeOtherSessions ? (
          <SettingsActions>
            <SettingsStatus
              message={sessionsStatus.message}
              error={sessionsStatus.error}
            />
            {canRevokeOtherSessions ? (
              <Button
                type="button"
                variant="soft"
                disabled={sessionBusy !== null}
                onClick={async () => {
                  setSessionBusy("others");
                  setSessionsStatus({
                    message: "Signing out other sessions…",
                    error: false,
                  });
                  const response = await fetch(
                    "/api/settings/sessions/revoke-others",
                    { method: "POST" },
                  ).catch(() => null);
                  setSessionBusy(null);
                  if (!response?.ok) {
                    const json = response
                      ? ((await response.json()) as { error?: string })
                      : null;
                    setSessionsStatus({
                      message:
                        json?.error ??
                        "Unable to sign out other sessions. Try again.",
                      error: true,
                    });
                    return;
                  }
                  setSessions((current) =>
                    current.filter((session) => session.current),
                  );
                  setSessionsStatus({
                    message: "Other sessions signed out.",
                    error: false,
                  });
                }}
              >
                {sessionBusy === "others"
                  ? "Signing out…"
                  : "Sign out other sessions"}
              </Button>
            ) : null}
          </SettingsActions>
        ) : null}
      </SettingsCard>
    </SettingsPage>
  );
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
