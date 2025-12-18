interface LightsProps {
  ambientIntensity?: number
  directionalIntensity?: number
}

export function Lights({ ambientIntensity = 0.5, directionalIntensity = 1 }: LightsProps) {
  return (
    <>
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[10, 10, 5]} intensity={directionalIntensity} castShadow />
    </>
  )
}
