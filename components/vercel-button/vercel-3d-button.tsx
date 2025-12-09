"use client"

/**
 * Vercel3DButton Component
 *
 * A full-featured 3D button editor with real-time controls for position,
 * rotation, scale, camera, and lighting. Designed for rapid prototyping
 * and configuration export.
 *
 * Features:
 * - 3D capsule button with Vercel logo and "Sign in with Vercel" text
 * - Interactive control panel for all properties
 * - Free camera mode (OrbitControls) or slider-based positioning
 * - Draggable light source with TransformControls
 * - White grid floor with realistic shadows
 * - Export configuration to JSON for use in production
 *
 * Control Panel Sections:
 * - Interaction Mode: Toggle orbit controls and light editing
 * - Light: Position (XYZ), intensity, warmth (color temperature)
 * - Button Position: XYZ positioning
 * - Button Rotation: XYZ rotation (multiplied by PI)
 * - Button Scale: XYZ scale factors
 * - Camera: Position (XYZ) and FOV
 * - Logo: Position (XYZ) and scale
 * - Text: Position (XYZ) and size
 *
 * 3D Components:
 * - CapsuleButton: Extruded capsule geometry with physical material
 * - VercelLogo: Triangular logo geometry
 * - ExtrudedText: 3D beveled text (requires /fonts/Inter_Bold.json)
 * - GridFloor: 100x100 grid with shadow-receiving plane
 *
 * @example
 * <Vercel3DButton />
 */

import type React from "react"
import { useRef, useState, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Text3D, Center, Environment, OrbitControls, TransformControls } from "@react-three/drei"
import * as THREE from "three"

/**
 * Configuration interface for all adjustable button properties.
 * These values can be exported to JSON for production use.
 */
interface ButtonConfig {
  buttonRotationX: number
  buttonRotationY: number
  buttonRotationZ: number
  buttonScaleX: number
  buttonScaleY: number
  buttonScaleZ: number
  buttonPositionX: number
  buttonPositionY: number
  buttonPositionZ: number
  cameraPositionX: number
  cameraPositionY: number
  cameraPositionZ: number
  cameraFov: number
  logoPositionX: number
  logoPositionY: number
  logoPositionZ: number
  logoScale: number
  textPositionX: number
  textPositionY: number
  textPositionZ: number
  textSize: number
  lightPositionX: number
  lightPositionY: number
  lightPositionZ: number
  lightIntensity: number
  lightWarmth: number
}

const defaultConfig: ButtonConfig = {
  buttonRotationX: 0,
  buttonRotationY: 0.02,
  buttonRotationZ: 0,
  buttonScaleX: 0.69,
  buttonScaleY: 0.7,
  buttonScaleZ: 0.7,
  buttonPositionX: 0.2,
  buttonPositionY: 0.2,
  buttonPositionZ: 0,
  cameraPositionX: 1.21,
  cameraPositionY: 2.69,
  cameraPositionZ: 1.37,
  cameraFov: 62,
  logoPositionX: -0.83,
  logoPositionY: 0.3,
  logoPositionZ: 0.04,
  logoScale: 1.14,
  textPositionX: 0.24,
  textPositionY: 0.3,
  textPositionZ: 0.05,
  textSize: 0.14,
  lightPositionX: 5.5,
  lightPositionY: 19,
  lightPositionZ: -14.5,
  lightIntensity: 10,
  lightWarmth: 1,
}

function getWarmthColor(warmth: number): string {
  const r = 255
  const g = Math.round(255 - warmth * 30)
  const b = Math.round(255 - warmth * 60)
  return `rgb(${r}, ${g}, ${b})`
}

function CapsuleButton({
  width = 2.4,
  height = 0.6,
  depth = 0.35,
}: { width?: number; height?: number; depth?: number }) {
  const geometry = useMemo(() => {
    const radius = height / 2
    const shape = new THREE.Shape()

    shape.moveTo(-width / 2 + radius, -height / 2)
    shape.lineTo(width / 2 - radius, -height / 2)
    shape.absarc(width / 2 - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false)
    shape.lineTo(-width / 2 + radius, height / 2)
    shape.absarc(-width / 2 + radius, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, false)

    const extrudeSettings = {
      depth: depth,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.12,
      bevelOffset: 0,
      bevelSegments: 24,
      curveSegments: 32,
    }

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings)
    geo.computeVertexNormals()
    return geo
  }, [width, height, depth])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#0a0a0a"
        roughness={0.15}
        metalness={0.05}
        clearcoat={0.4}
        clearcoatRoughness={0.15}
        envMapIntensity={0.6}
      />
    </mesh>
  )
}

function VercelLogo({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const s = 0.12
    shape.moveTo(0, s)
    shape.lineTo(-s * 0.9, -s * 0.5)
    shape.lineTo(s * 0.9, -s * 0.5)
    shape.closePath()

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.02,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 3,
    })
  }, [])

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} geometry={geometry} scale={scale} castShadow>
      <meshPhysicalMaterial color="#f5f5f5" roughness={0.2} metalness={0.02} clearcoat={0.2} clearcoatRoughness={0.3} />
    </mesh>
  )
}

function ExtrudedText({ position, size }: { position: [number, number, number]; size: number }) {
  return (
    <Center position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <Text3D
        font="/fonts/Inter_Bold.json"
        size={size}
        height={0.018}
        bevelEnabled
        bevelThickness={0.004}
        bevelSize={0.003}
        bevelSegments={3}
        curveSegments={12}
        castShadow
      >
        Sign in with Vercel
        <meshPhysicalMaterial
          color="#f5f5f5"
          roughness={0.2}
          metalness={0.02}
          clearcoat={0.2}
          clearcoatRoughness={0.3}
        />
      </Text3D>
    </Center>
  )
}

function Button3D({ config }: { config: ButtonConfig }) {
  const groupRef = useRef<THREE.Group>(null)
  const [isPressed, setIsPressed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const targetY = useRef(0)
  const currentY = useRef(0)
  const targetPressScale = useRef(1)
  const currentPressScale = useRef(1)

  useFrame((_, delta) => {
    if (!groupRef.current) return

    targetY.current = isPressed ? -0.05 : 0
    targetPressScale.current = isPressed ? 0.98 : isHovered ? 1.02 : 1

    const lerpSpeed = 12 * delta
    currentY.current = THREE.MathUtils.lerp(currentY.current, targetY.current, lerpSpeed)
    currentPressScale.current = THREE.MathUtils.lerp(currentPressScale.current, targetPressScale.current, lerpSpeed)

    groupRef.current.position.set(
      config.buttonPositionX,
      config.buttonPositionY + currentY.current,
      config.buttonPositionZ,
    )
    groupRef.current.scale.set(
      config.buttonScaleX * currentPressScale.current,
      config.buttonScaleY * currentPressScale.current,
      config.buttonScaleZ * currentPressScale.current,
    )
  })

  return (
    <group
      ref={groupRef}
      position={[config.buttonPositionX, config.buttonPositionY, config.buttonPositionZ]}
      rotation={[Math.PI * config.buttonRotationX, Math.PI * config.buttonRotationY, Math.PI * config.buttonRotationZ]}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => {
        setIsPressed(false)
        setIsHovered(false)
      }}
      onPointerEnter={() => setIsHovered(true)}
    >
      <group rotation={[Math.PI / 2, 0, 0]} position={[0, 0.175, 0]}>
        <CapsuleButton width={2.6} height={0.65} depth={0.35} />
      </group>

      <VercelLogo
        position={[config.logoPositionX, config.logoPositionY, config.logoPositionZ]}
        scale={config.logoScale}
      />

      <ExtrudedText
        position={[config.textPositionX, config.textPositionY, config.textPositionZ]}
        size={config.textSize}
      />
    </group>
  )
}

function GridFloor() {
  return (
    <group position={[0, 0, 0]}>
      {/* White floor background with receiveShadow for directionalLight shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Grid lines - smaller cells, subtle lines */}
      <gridHelper args={[100, 200, "#d0d0d0", "#e0e0e0"]} position={[0, 0.001, 0]} />
    </group>
  )
}

function DraggableLight({
  config,
  setConfig,
  lightColor,
  editLightMode,
}: {
  config: ButtonConfig
  setConfig: React.Dispatch<React.SetStateAction<ButtonConfig>>
  lightColor: string
  editLightMode: boolean
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null)
  const sphereRef = useRef<THREE.Mesh>(null)

  return (
    <>
      {/* Single directional light source */}
      <directionalLight
        ref={lightRef}
        position={[config.lightPositionX, config.lightPositionY, config.lightPositionZ]}
        intensity={config.lightIntensity}
        color={lightColor}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
        shadow-radius={3}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {editLightMode && (
        <TransformControls
          position={[config.lightPositionX, config.lightPositionY, config.lightPositionZ]}
          mode="translate"
          onObjectChange={(e) => {
            if (e?.target) {
              const pos = (e.target as any).worldPosition
              if (pos) {
                setConfig((c) => ({
                  ...c,
                  lightPositionX: pos.x,
                  lightPositionY: pos.y,
                  lightPositionZ: pos.z,
                }))
              }
            }
          }}
        >
          <mesh ref={sphereRef}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ffcc00" transparent opacity={0.8} />
          </mesh>
        </TransformControls>
      )}
    </>
  )
}

function CameraSync({
  config,
  setConfig,
  orbitControlsEnabled,
}: {
  config: ButtonConfig
  setConfig: React.Dispatch<React.SetStateAction<ButtonConfig>>
  orbitControlsEnabled: boolean
}) {
  const { camera } = useThree()

  useEffect(() => {
    if (!orbitControlsEnabled) {
      camera.position.set(config.cameraPositionX, config.cameraPositionY, config.cameraPositionZ)
      camera.lookAt(0, 0, 0)
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = config.cameraFov
        camera.updateProjectionMatrix()
      }
    }
  }, [
    config.cameraPositionX,
    config.cameraPositionY,
    config.cameraPositionZ,
    config.cameraFov,
    orbitControlsEnabled,
    camera,
  ])

  return null
}

function OrbitControlsWrapper({
  setConfig,
  enabled,
  fov,
}: {
  setConfig: React.Dispatch<React.SetStateAction<ButtonConfig>>
  enabled: boolean
  fov: number
}) {
  const { camera } = useThree()

  useFrame(() => {
    if (enabled) {
      setConfig((c) => ({
        ...c,
        cameraPositionX: Number.parseFloat(camera.position.x.toFixed(2)),
        cameraPositionY: Number.parseFloat(camera.position.y.toFixed(2)),
        cameraPositionZ: Number.parseFloat(camera.position.z.toFixed(2)),
      }))
    }
  })

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [fov, camera])

  return (
    <OrbitControls
      enabled={enabled}
      enableDamping
      dampingFactor={0.05}
      minDistance={1}
      maxDistance={30}
      target={[0, 0, 0]}
    />
  )
}

function ControlPanel({
  config,
  setConfig,
  showControls,
  setShowControls,
  orbitControlsEnabled,
  setOrbitControlsEnabled,
  editLightMode,
  setEditLightMode,
}: {
  config: ButtonConfig
  setConfig: React.Dispatch<React.SetStateAction<ButtonConfig>>
  showControls: boolean
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>
  orbitControlsEnabled: boolean
  setOrbitControlsEnabled: React.Dispatch<React.SetStateAction<boolean>>
  editLightMode: boolean
  setEditLightMode: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const exportConfig = () => {
    const configString = JSON.stringify(config, null, 2)
    navigator.clipboard.writeText(configString)
    alert("Config copiado al clipboard!\n\n" + configString)
  }

  const Slider = ({
    label,
    value,
    onChange,
    min,
    max,
    step,
  }: {
    label: string
    value: number
    onChange: (v: number) => void
    min: number
    max: number
    step: number
  }) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-neutral-600 flex justify-between">
        <span>{label}</span>
        <span className="font-mono text-neutral-400">{value.toFixed(2)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
      />
    </div>
  )

  if (!showControls) {
    return (
      <button
        onClick={() => setShowControls(true)}
        className="absolute top-4 right-4 z-10 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
      >
        Show Controls
      </button>
    )
  }

  return (
    <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 w-72 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-sm">Position Controls</h3>
        <button onClick={() => setShowControls(false)} className="text-neutral-400 hover:text-black text-lg">
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">INTERACTION MODE</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={orbitControlsEnabled}
                onChange={(e) => setOrbitControlsEnabled(e.target.checked)}
                className="accent-black w-4 h-4"
              />
              <span className="text-sm">Free Camera (mouse orbit)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editLightMode}
                onChange={(e) => setEditLightMode(e.target.checked)}
                className="accent-black w-4 h-4"
              />
              <span className="text-sm">Edit Light (drag sphere)</span>
            </label>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            {orbitControlsEnabled
              ? "Left-click drag to orbit, scroll to zoom, right-click to pan"
              : "Use sliders to position camera"}
          </p>
        </div>

        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">LIGHT</h4>
          <div className="space-y-2">
            <Slider
              label="Position X"
              value={config.lightPositionX}
              onChange={(v) => setConfig((c) => ({ ...c, lightPositionX: v }))}
              min={-20}
              max={20}
              step={0.5}
            />
            <Slider
              label="Position Y"
              value={config.lightPositionY}
              onChange={(v) => setConfig((c) => ({ ...c, lightPositionY: v }))}
              min={1}
              max={30}
              step={0.5}
            />
            <Slider
              label="Position Z"
              value={config.lightPositionZ}
              onChange={(v) => setConfig((c) => ({ ...c, lightPositionZ: v }))}
              min={-20}
              max={20}
              step={0.5}
            />
            <Slider
              label="Intensity"
              value={config.lightIntensity}
              onChange={(v) => setConfig((c) => ({ ...c, lightIntensity: v }))}
              min={0}
              max={15}
              step={0.1}
            />
            <Slider
              label="Warmth"
              value={config.lightWarmth}
              onChange={(v) => setConfig((c) => ({ ...c, lightWarmth: v }))}
              min={0}
              max={1}
              step={0.05}
            />
          </div>
        </div>

        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">BUTTON POSITION</h4>
          <div className="space-y-2">
            <Slider
              label="Position X"
              value={config.buttonPositionX}
              onChange={(v) => setConfig((c) => ({ ...c, buttonPositionX: v }))}
              min={-5}
              max={5}
              step={0.1}
            />
            <Slider
              label="Position Y"
              value={config.buttonPositionY}
              onChange={(v) => setConfig((c) => ({ ...c, buttonPositionY: v }))}
              min={-2}
              max={3}
              step={0.1}
            />
            <Slider
              label="Position Z"
              value={config.buttonPositionZ}
              onChange={(v) => setConfig((c) => ({ ...c, buttonPositionZ: v }))}
              min={-5}
              max={5}
              step={0.1}
            />
          </div>
        </div>

        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">BUTTON ROTATION (× π)</h4>
          <div className="space-y-2">
            <Slider
              label="Rotation X"
              value={config.buttonRotationX}
              onChange={(v) => setConfig((c) => ({ ...c, buttonRotationX: v }))}
              min={-0.5}
              max={0.5}
              step={0.01}
            />
            <Slider
              label="Rotation Y"
              value={config.buttonRotationY}
              onChange={(v) => setConfig((c) => ({ ...c, buttonRotationY: v }))}
              min={-1}
              max={1}
              step={0.01}
            />
            <Slider
              label="Rotation Z"
              value={config.buttonRotationZ}
              onChange={(v) => setConfig((c) => ({ ...c, buttonRotationZ: v }))}
              min={-1}
              max={1}
              step={0.01}
            />
          </div>
        </div>

        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">BUTTON SCALE</h4>
          <div className="space-y-2">
            <Slider
              label="Scale X"
              value={config.buttonScaleX}
              onChange={(v) => setConfig((c) => ({ ...c, buttonScaleX: v }))}
              min={0.3}
              max={2}
              step={0.01}
            />
            <Slider
              label="Scale Y"
              value={config.buttonScaleY}
              onChange={(v) => setConfig((c) => ({ ...c, buttonScaleY: v }))}
              min={0.3}
              max={2}
              step={0.01}
            />
            <Slider
              label="Scale Z"
              value={config.buttonScaleZ}
              onChange={(v) => setConfig((c) => ({ ...c, buttonScaleZ: v }))}
              min={0.3}
              max={2}
              step={0.01}
            />
          </div>
        </div>

        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">CAMERA</h4>
          <div className="space-y-2">
            <Slider
              label="Position X"
              value={config.cameraPositionX}
              onChange={(v) => setConfig((c) => ({ ...c, cameraPositionX: v }))}
              min={-10}
              max={10}
              step={0.1}
            />
            <Slider
              label="Position Y"
              value={config.cameraPositionY}
              onChange={(v) => setConfig((c) => ({ ...c, cameraPositionY: v }))}
              min={0}
              max={15}
              step={0.1}
            />
            <Slider
              label="Position Z"
              value={config.cameraPositionZ}
              onChange={(v) => setConfig((c) => ({ ...c, cameraPositionZ: v }))}
              min={0}
              max={15}
              step={0.1}
            />
            <Slider
              label="FOV"
              value={config.cameraFov}
              onChange={(v) => setConfig((c) => ({ ...c, cameraFov: v }))}
              min={10}
              max={90}
              step={1}
            />
          </div>
        </div>

        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">LOGO</h4>
          <div className="space-y-2">
            <Slider
              label="Position X"
              value={config.logoPositionX}
              onChange={(v) => setConfig((c) => ({ ...c, logoPositionX: v }))}
              min={-2}
              max={2}
              step={0.01}
            />
            <Slider
              label="Position Y"
              value={config.logoPositionY}
              onChange={(v) => setConfig((c) => ({ ...c, logoPositionY: v }))}
              min={0}
              max={1}
              step={0.01}
            />
            <Slider
              label="Position Z"
              value={config.logoPositionZ}
              onChange={(v) => setConfig((c) => ({ ...c, logoPositionZ: v }))}
              min={-1}
              max={1}
              step={0.01}
            />
            <Slider
              label="Scale"
              value={config.logoScale}
              onChange={(v) => setConfig((c) => ({ ...c, logoScale: v }))}
              min={0.5}
              max={2}
              step={0.01}
            />
          </div>
        </div>

        <div className="border-b pb-3">
          <h4 className="text-xs font-medium text-neutral-500 mb-2">TEXT</h4>
          <div className="space-y-2">
            <Slider
              label="Position X"
              value={config.textPositionX}
              onChange={(v) => setConfig((c) => ({ ...c, textPositionX: v }))}
              min={-2}
              max={2}
              step={0.01}
            />
            <Slider
              label="Position Y"
              value={config.textPositionY}
              onChange={(v) => setConfig((c) => ({ ...c, textPositionY: v }))}
              min={0}
              max={1}
              step={0.01}
            />
            <Slider
              label="Position Z"
              value={config.textPositionZ}
              onChange={(v) => setConfig((c) => ({ ...c, textPositionZ: v }))}
              min={-1}
              max={1}
              step={0.01}
            />
            <Slider
              label="Size"
              value={config.textSize}
              onChange={(v) => setConfig((c) => ({ ...c, textSize: v }))}
              min={0.08}
              max={0.3}
              step={0.01}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportConfig}
            className="flex-1 bg-black text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Export Config
          </button>
          <button
            onClick={() => setConfig(defaultConfig)}
            className="px-4 py-2 border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-100 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Vercel3DButton() {
  const [config, setConfig] = useState<ButtonConfig>(defaultConfig)
  const [showControls, setShowControls] = useState(false)
  const [orbitControlsEnabled, setOrbitControlsEnabled] = useState(true)
  const [editLightMode, setEditLightMode] = useState(false)
  const lightColor = getWarmthColor(config.lightWarmth)

  return (
    <div className="w-full h-screen bg-white relative">
      <Canvas
        shadows
        camera={{
          position: [config.cameraPositionX, config.cameraPositionY, config.cameraPositionZ],
          fov: config.cameraFov,
        }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#ffffff"]} />

        {/* Minimal ambient for soft fill */}
        <ambientLight intensity={0.3} />

        {/* Single main light source */}
        <DraggableLight config={config} setConfig={setConfig} lightColor={lightColor} editLightMode={editLightMode} />

        <Environment preset="studio" />

        <GridFloor />

        <Button3D config={config} />

        <CameraSync config={config} setConfig={setConfig} orbitControlsEnabled={orbitControlsEnabled} />
        <OrbitControlsWrapper setConfig={setConfig} enabled={orbitControlsEnabled} fov={config.cameraFov} />
      </Canvas>

      <ControlPanel
        config={config}
        setConfig={setConfig}
        showControls={showControls}
        setShowControls={setShowControls}
        orbitControlsEnabled={orbitControlsEnabled}
        setOrbitControlsEnabled={setOrbitControlsEnabled}
        editLightMode={editLightMode}
        setEditLightMode={setEditLightMode}
      />
    </div>
  )
}
