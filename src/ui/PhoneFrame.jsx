import "./simhud.css";
import "./phone.css";
import { SimHud } from "./SimHud";
import { Joystick } from "./Mobile/Joystick";
import { ActionButton } from "./Mobile/ActionButton";
import { CompanySwitcher } from "./Panels/CompanySwitcher";

export function PhoneFrame({ children }) {
  return (
    <div className="phone-backdrop">
      <div className="phone">
        <div className="phone-notch">
          <div className="phone-speaker" />
        </div>

        <div className="phone-screen">
          {children}

          <SimHud />

          <div className="phone-company">
            <CompanySwitcher />
          </div>

          <Joystick />
          <div className="hud-actions">
            <ActionButton label="RUN" keyLabel="shift" className="act-run" />
            <ActionButton label="JUMP" keyLabel=" " className="act-jump" />
          </div>
        </div>

        <div className="phone-home" />
      </div>
    </div>
  );
}
