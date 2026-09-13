import { Physics } from "@react-three/rapier";

export function PhysicsWorld({ children }) {
  return (
    <Physics gravity={[0, -9.81, 0]}>
      {children}
    </Physics>
  );
}