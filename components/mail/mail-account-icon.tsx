import * as stylex from "@stylexjs/stylex";
import { Icons } from "@/components/ui/icons";
import type { MailConnectorId } from "@/lib/mail/types";
import { colors, radius } from "@/theme/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    flexShrink: 0,
    color: colors.textMuted,
  },
  large: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceActive,
  },
});

function ProviderMark({
  large,
}: {
  large: boolean;
}) {
  return <Icons.world size={large ? 19 : 17} />;
}

export function MailAccountIcon({
  connector,
  size = "small",
}: {
  connector: MailConnectorId;
  size?: "small" | "large";
}) {
  void connector;
  const large = size === "large";

  return (
    <span
      aria-hidden="true"
      {...stylex.props(styles.root, large && styles.large)}
    >
      <ProviderMark large={large} />
    </span>
  );
}
