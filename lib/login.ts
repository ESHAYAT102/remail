export type LoginFields = {
  email: string;
  password: string;
};

const emptyLogin: LoginFields = { email: "", password: "" };
const demoLogin: LoginFields = {
  email: "ada@redakt.local",
  password: "demo",
};

export function getInitialLoginFields(demoMode: boolean): LoginFields {
  return demoMode ? demoLogin : emptyLogin;
}
