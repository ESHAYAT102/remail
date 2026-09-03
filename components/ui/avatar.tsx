import { Blobatar } from "@blobatar/react";
import * as stylex from "@stylexjs/stylex";
import "blobatar/motion.css";

const avatarTraits = {
  shape: 0.11,
  "body.r": 0.999,
  "body.ratio": 0,
  "body.n": 0,
  "eye.rx": 0.231,
  "eye.ratio": 0.51,
  "eye.n": 0.346,
  "eye.gap": 0.517,
};

const styles = stylex.create({
  root: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    display: "block",
    flexShrink: 0,
    overflow: "hidden",
  },
  lg: {
    width: 28,
    height: 28,
  },
  image: {
    width: "100%",
    height: "100%",
    display: "block",
    transform: "scale(1.28)",
  },
});

export function Avatar({
  name,
  size = "sm",
}: {
  name: string;
  size?: "sm" | "lg";
}) {
  const styled = stylex.props(styles.root, size === "lg" && styles.lg);
  const image = stylex.props(styles.image);
  return (
    <span className={styled.className} style={styled.style}>
      <Blobatar
        name={name || "?"}
        traits={avatarTraits}
        animate="hover"
        className={image.className}
        style={image.style}
      />
    </span>
  );
}
