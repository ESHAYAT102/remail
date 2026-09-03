import Image from "next/image";
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
  logo: {
    display: "block",
  },
});

function ProviderMark({
  connector,
  large,
}: {
  connector: MailConnectorId;
  large: boolean;
}) {
  switch (connector) {
    case "gmail":
      return (
        <Image
          src="/providers/gmail.svg"
          alt=""
          width={large ? 22 : 20}
          height={large ? 18 : 16}
          unoptimized
          {...stylex.props(styles.logo)}
        />
      );
    case "hosted":
      return <Icons.world size={large ? 19 : 17} />;
    default: {
      const unsupportedConnector: never = connector;
      return unsupportedConnector;
    }
  }
}

export function MailAccountIcon({
  connector,
  size = "small",
}: {
  connector: MailConnectorId;
  size?: "small" | "large";
}) {
  const large = size === "large";

  return (
    <span
      aria-hidden="true"
      {...stylex.props(styles.root, large && styles.large)}
    >
      <ProviderMark connector={connector} large={large} />
    </span>
  );
}
