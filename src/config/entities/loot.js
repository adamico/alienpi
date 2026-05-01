import { vec2, rgb } from "../../engine.js";

export const loot = {
  hitboxScale: 0.8,
  mirrorY: true,
  size: vec2(1.5, 0.65),
  speed: 0.05,
  types: {
    blue: { letter: "V", color: rgb(0.2, 0.6, 0.8), label: "Vulcan" },
    green: { letter: "B", color: rgb(0.2, 0.65, 0.25), label: "Beam" },
    red: { letter: "S", color: rgb(1, 0.2, 0.2), label: "Shotgun" },
    star: { letter: "★", color: rgb(0.75, 0.6, 0.1), label: "Star Upgrade" },
  },
};
