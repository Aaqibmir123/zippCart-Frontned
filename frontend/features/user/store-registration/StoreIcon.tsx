import Svg, { Path } from "react-native-svg";
import { palette } from "./registration.styles";

const paths = {
  store:
    "M3 10h18l-2-6H5l-2 6Zm2 0v11h14V10M9 21v-7h6v7M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  document: "M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6",
  wallet: "M3 6h17v15H3V6Zm0 0V3h14v3m-2 7h5v4h-5v-4Z",
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6",
  check: "m5 12 4 4L19 6",
  back: "m14 6-6 6 6 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
};
export function StoreIcon({
  name,
  size = 24,
  color = palette.accent,
}: {
  name: keyof typeof paths;
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
