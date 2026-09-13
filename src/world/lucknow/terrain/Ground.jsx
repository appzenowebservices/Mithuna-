import { RigidBody } from "@react-three/rapier";

export function Ground() {
  return (
    <RigidBody type="fixed">
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[250, 250]} />
        <meshStandardMaterial color="#bfd64b" />
      </mesh>
    </RigidBody>
  );
}