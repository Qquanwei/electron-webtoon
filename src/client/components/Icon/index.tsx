import settings from "@imgs/setting.png";
import phone from "@imgs/phone.png";
import comic from "@imgs/comic.png";
import { HTMLAttributes } from "react";

const Imgs = {
  settings,
  comic,
  phone,
};
interface IconProps
  extends Pick<HTMLAttributes<HTMLDivElement>, "className" | "onClick"> {
  name: keyof typeof Imgs;
  tooltip?: string;
}
const Icon: React.FC<IconProps> = ({ name, tooltip, className, onClick }) => {
  return (
    <div
      title={tooltip || ""}
      onClick={onClick}
      className={(className || "") + " bg-contain bg-center bg-no-repeat"}
      style={{
        backgroundImage: `url(${Imgs[name]})`,
      }}
    ></div>
  );
};

export default Icon;
