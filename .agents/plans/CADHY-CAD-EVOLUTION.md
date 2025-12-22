# CADHY CAD Evolution Plan

> **Objetivo**: Transformar CADHY en un CAD completo con familias hidráulicas paramétricas
> **Fecha**: 2025-12-20
> **Estado**: PLAN APROBADO
> **Referencia**: Patrones de Plasticity adaptados a React + Tauri

---

## Resumen Ejecutivo

Adoptar los patrones de Plasticity para crear un CAD profesional especializado en hidráulica:

1. **CAD Completo**: Todas las operaciones de modelado directo
2. **Familias Hidráulicas**: Sólidos paramétricos pre-construidos
3. **Snaps Inteligentes**: Sistema de snapping profesional
4. **Gizmos Interactivos**: Manipulación visual con entrada de teclado
5. **Undo/Redo Robusto**: Sistema de historial con mementos

---

## Parte 1: Familias Hidráulicas Paramétricas

### 1.1 Concepto de Familia Paramétrica

```typescript
// packages/factory/src/families/HydraulicFamily.ts

export interface ParametricFamily<TParams, TResult> {
  // Metadata
  readonly id: string;
  readonly name: string;
  readonly category: FamilyCategory;
  readonly icon: string;
  readonly description: string;
  
  // Parameters schema (Zod)
  readonly schema: z.ZodType<TParams>;
  
  // Default values
  readonly defaults: TParams;
  
  // Validation
  validate(params: TParams): ValidationResult;
  
  // Preview (fast, approximate mesh)
  preview(params: TParams): Promise<MeshData>;
  
  // Generate final geometry (Rust backend)
  generate(params: TParams): Promise<GenerationResult>;
  
  // Snap points for this family
  getSnapPoints(params: TParams): SnapPoint[];
  
  // Constraints (what can connect to what)
  getConnectors(params: TParams): Connector[];
}

export type FamilyCategory = 
  | 'channels'           // Canales
  | 'transitions'        // Transiciones
  | 'dissipators'        // Disipadores de energía
  | 'structures'         // Estructuras de control
  | 'conduits'           // Conductos cerrados
  | 'manholes'           // Pozos de visita
  | 'intakes'            // Obras de toma
  | 'outlets';           // Obras de descarga
```

### 1.2 Catálogo de Familias Hidráulicas

#### A. Canales (Channels)

```typescript
// 1. Canal Rectangular
interface RectangularChannelParams {
  width: number;           // Ancho de plantilla (m)
  height: number;          // Altura de muro (m)
  length: number;          // Longitud (m)
  slope: number;           // Pendiente longitudinal (m/m)
  wallThickness: number;   // Espesor de muro (m)
  baseThickness: number;   // Espesor de plantilla (m)
  
  // Opcionales
  freeboard?: number;      // Bordo libre (m)
  roughness?: number;      // Coeficiente de Manning
  hasCover?: boolean;      // Con tapa
}

// 2. Canal Trapezoidal
interface TrapezoidalChannelParams {
  bottomWidth: number;     // Ancho de plantilla (m)
  topWidth: number;        // Ancho en corona (m)
  height: number;          // Altura (m)
  length: number;          // Longitud (m)
  slope: number;           // Pendiente longitudinal
  sideSlope: number;       // Talud lateral (H:V)
  liningThickness: number; // Espesor de revestimiento
}

// 3. Canal Circular
interface CircularChannelParams {
  diameter: number;        // Diámetro interior (m)
  length: number;          // Longitud (m)
  slope: number;           // Pendiente
  wallThickness: number;   // Espesor de pared
  fillRatio?: number;      // Relación de llenado (0-1)
}

// 4. Canal Parabólico
interface ParabolicChannelParams {
  topWidth: number;        // Ancho en superficie (m)
  depth: number;           // Profundidad (m)
  length: number;          // Longitud (m)
  slope: number;           // Pendiente
  liningThickness: number;
}

// 5. Canal Triangular
interface TriangularChannelParams {
  topWidth: number;        // Ancho en corona (m)
  depth: number;           // Profundidad (m)
  length: number;          // Longitud (m)
  slope: number;           // Pendiente
  sideSlope: number;       // Talud (H:V)
}

// 6. Canal Compuesto
interface CompositeChannelParams {
  mainSection: SectionParams;
  berms: BermParams[];     // Bermas laterales
  length: number;
  slope: number;
}
```

#### B. Transiciones (Transitions)

```typescript
// 1. Transición de Entrada (Inlet)
interface InletTransitionParams {
  upstreamWidth: number;   // Ancho aguas arriba
  downstreamWidth: number; // Ancho aguas abajo
  length: number;          // Longitud de transición
  type: 'linear' | 'warped' | 'cylindrical-quadrant';
  dropHeight?: number;     // Caída (si hay)
  upstreamInvert: number;  // Cota de plantilla entrada
  downstreamInvert: number;// Cota de plantilla salida
}

// 2. Transición de Salida (Outlet)
interface OutletTransitionParams {
  upstreamWidth: number;
  downstreamWidth: number;
  length: number;
  type: 'linear' | 'warped' | 'flared';
  riseHeight?: number;     // Elevación
}

// 3. Transición entre secciones diferentes
interface SectionTransitionParams {
  upstreamSection: SectionType;
  downstreamSection: SectionType;
  upstreamParams: SectionParams;
  downstreamParams: SectionParams;
  length: number;
  transitionType: 'linear' | 'smooth' | 'stepped';
}

// 4. Caída Vertical (Drop Structure)
interface DropStructureParams {
  width: number;
  dropHeight: number;      // Altura de caída
  type: 'straight' | 'inclined' | 'stepped';
  poolDepth?: number;      // Profundidad de poza
  poolLength?: number;     // Longitud de poza
}
```

#### C. Disipadores de Energía (Energy Dissipators)

```typescript
// 1. Estanque Tipo I (USBR)
interface StillingBasinType1Params {
  width: number;
  length: number;          // Longitud del estanque
  depth: number;           // Profundidad bajo nivel aguas abajo
  endSillHeight: number;   // Altura del dentellón final
  endSillType: 'dentated' | 'solid';
  incomingFroude: number;  // Número de Froude de entrada
}

// 2. Estanque Tipo II (USBR)
interface StillingBasinType2Params {
  width: number;
  length: number;
  depth: number;
  chuteblocksCount: number;     // Número de bloques de caída
  chuteblocksHeight: number;
  chuteblocksWidth: number;
  chuteblocksSpacing: number;
  dentatedSillHeight: number;
  dentatedSillSpacing: number;
}

// 3. Estanque Tipo III (USBR)
interface StillingBasinType3Params {
  width: number;
  length: number;
  depth: number;
  chuteblocksCount: number;
  chuteblocksHeight: number;
  bafflePiersCount: number;     // Bloques deflectores
  bafflePiersHeight: number;
  bafflePiersWidth: number;
  bafflePiersPosition: number;  // Posición desde entrada
  endSillHeight: number;
}

// 4. Estanque Tipo IV (USBR)
interface StillingBasinType4Params {
  width: number;
  length: number;
  depth: number;
  chuteblocksOptional: boolean;
  deflectorBlocksCount: number;
  deflectorBlocksHeight: number;
  endSillHeight: number;
  endSillSlope: number;         // Talud del dentellón
}

// 5. Estanque SAF (Saint Anthony Falls)
interface SAFBasinParams {
  width: number;
  incomingFroude: number;
  incomingVelocity: number;
  incomingDepth: number;
  // Auto-calculados según metodología SAF
}

// 6. Trampolín (Flip Bucket / Ski Jump)
interface FlipBucketParams {
  width: number;
  radius: number;          // Radio de curvatura
  exitAngle: number;       // Ángulo de salida (grados)
  lipHeight: number;       // Altura del labio
  bucketInvert: number;    // Cota de fondo del trampolín
}

// 7. Disipador de Impacto (Impact Basin)
interface ImpactBasinParams {
  width: number;
  length: number;
  impactWallHeight: number;
  impactWallPosition: number;
  exitWeir: boolean;
  exitWeirHeight?: number;
}
```

#### D. Estructuras de Control (Control Structures)

```typescript
// 1. Vertedero Rectangular
interface RectangularWeirParams {
  crestLength: number;     // Longitud de cresta
  crestHeight: number;     // Altura de cresta sobre fondo
  approachWidth: number;   // Ancho de aproximación
  type: 'sharp-crested' | 'broad-crested' | 'ogee';
  contractions: 0 | 1 | 2; // Número de contracciones
}

// 2. Vertedero Ogee (Cimacio)
interface OgeeWeirParams {
  crestLength: number;
  designHead: number;      // Carga de diseño
  crestElevation: number;
  upstreamSlope: number;   // Talud aguas arriba (V:H)
  downstreamSlope: number; // Talud aguas abajo
  profileType: 'WES' | 'USBR';
}

// 3. Compuerta Deslizante
interface SlideGateParams {
  width: number;
  height: number;
  frameDepth: number;
  sillHeight: number;      // Altura del umbral
  operatingHeight: number; // Altura máxima de apertura
}

// 4. Compuerta Radial (Tainter Gate)
interface RadialGateParams {
  width: number;
  height: number;          // Altura de la hoja
  radius: number;          // Radio de curvatura
  pivotHeight: number;     // Altura del pivote
  sillHeight: number;
}

// 5. Aforador Parshall
interface ParshallFlumeParams {
  throatWidth: number;     // Ancho de garganta (W)
  // Dimensiones automáticas según estándar
}

// 6. Canal Venturi
interface VenturiFlumeParams {
  approachWidth: number;
  throatWidth: number;
  length: number;
  contractionAngle: number;
  expansionAngle: number;
}
```

#### E. Conductos Cerrados (Closed Conduits)

```typescript
// 1. Tubería Circular
interface CircularPipeParams {
  diameter: number;
  length: number;
  slope: number;
  wallThickness: number;
  material: 'concrete' | 'steel' | 'pvc' | 'hdpe';
  jointType: 'bell-spigot' | 'welded' | 'flanged';
}

// 2. Conducto Herradura
interface HorseshoePipeParams {
  width: number;
  rise: number;            // Altura
  length: number;
  wallThickness: number;
}

// 3. Conducto Rectangular (Box Culvert)
interface BoxCulvertParams {
  width: number;
  height: number;
  length: number;
  wallThickness: number;
  hasCover: boolean;
  barrels: number;         // Número de celdas
}

// 4. Sifón Invertido
interface InvertedSiphonParams {
  diameter: number;
  inletInvert: number;
  outletInvert: number;
  lowestInvert: number;    // Cota más baja
  horizontalLength: number;
  inletTransitionLength: number;
  outletTransitionLength: number;
}
```

#### F. Pozos de Visita (Manholes)

```typescript
// 1. Pozo de Visita Estándar
interface StandardManholeParams {
  shaftDiameter: number;   // Diámetro de chimenea
  baseDiameter: number;    // Diámetro de base
  depth: number;           // Profundidad total
  benchHeight: number;     // Altura de banqueta
  inletPipes: PipeConnection[];
  outletPipe: PipeConnection;
  dropType: 'none' | 'internal' | 'external';
}

// 2. Caja de Unión
interface JunctionBoxParams {
  width: number;
  length: number;
  depth: number;
  inlets: PipeConnection[];
  outlet: PipeConnection;
}

// 3. Cámara de Carga
interface HeadChamberParams {
  width: number;
  length: number;
  operatingHead: number;   // Carga de operación
  inletType: 'pipe' | 'channel';
  outletDiameter: number;
  trashRackSpacing: number;
}
```

#### G. Obras de Toma (Intake Structures)

```typescript
// 1. Bocatoma Lateral
interface LateralIntakeParams {
  gateWidth: number;
  gateHeight: number;
  gateCount: number;
  sillHeight: number;
  approachChannelWidth: number;
  sedimentationBasinLength?: number;
}

// 2. Bocatoma de Fondo (Bottom Intake)
interface BottomIntakeParams {
  grillWidth: number;
  grillLength: number;
  barSpacing: number;
  barWidth: number;
  barSlope: number;        // Pendiente de rejilla
  collectionChannelWidth: number;
}

// 3. Toma Torre (Tower Intake)
interface TowerIntakeParams {
  diameter: number;
  height: number;
  portCount: number;
  portHeight: number;
  portWidth: number;
  portSpacing: number;     // Espaciamiento vertical
}
```

### 1.3 Sistema de Conectores

```typescript
// Cada familia expone conectores para unir con otras
interface Connector {
  id: string;
  type: 'inlet' | 'outlet' | 'side';
  position: Vec3;
  direction: Vec3;         // Normal de la cara
  sectionType: SectionType;
  sectionParams: SectionParams;
  elevation: number;
  canConnectTo: FamilyCategory[];
}

// Ejemplo: Canal rectangular
class RectangularChannelFamily implements ParametricFamily<RectangularChannelParams, Solid> {
  getConnectors(params: RectangularChannelParams): Connector[] {
    return [
      {
        id: 'inlet',
        type: 'inlet',
        position: { x: 0, y: 0, z: 0 },
        direction: { x: -1, y: 0, z: 0 },
        sectionType: 'rectangular',
        sectionParams: { width: params.width, height: params.height },
        elevation: params.slope * 0,  // Cota de entrada
        canConnectTo: ['channels', 'transitions', 'structures'],
      },
      {
        id: 'outlet',
        type: 'outlet',
        position: { x: params.length, y: 0, z: -params.length * params.slope },
        direction: { x: 1, y: 0, z: 0 },
        sectionType: 'rectangular',
        sectionParams: { width: params.width, height: params.height },
        elevation: -params.slope * params.length,
        canConnectTo: ['channels', 'transitions', 'dissipators', 'structures'],
      },
    ];
  }
}
```

### 1.4 Validaciones Hidráulicas Automáticas

```typescript
// Cada familia implementa validaciones de ingeniería
interface HydraulicValidation {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  calculations: HydraulicCalculations;
}

interface ValidationError {
  code: string;
  message: string;
  parameter: string;
  suggestedValue?: number;
}

// Ejemplo: Validación de estanque USBR
function validateUSBRType2(params: StillingBasinType2Params): HydraulicValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // Validar rango de Froude
  if (params.incomingFroude < 4.5 || params.incomingFroude > 9.0) {
    errors.push({
      code: 'FROUDE_OUT_OF_RANGE',
      message: 'Estanque Tipo II es para 4.5 ≤ Fr ≤ 9.0',
      parameter: 'incomingFroude',
      suggestedValue: params.incomingFroude < 4.5 ? 4.5 : 9.0,
    });
  }
  
  // Calcular longitud requerida según USBR
  const requiredLength = calculateUSBRType2Length(params);
  if (params.length < requiredLength * 0.95) {
    errors.push({
      code: 'LENGTH_INSUFFICIENT',
      message: `Longitud mínima requerida: ${requiredLength.toFixed(2)} m`,
      parameter: 'length',
      suggestedValue: requiredLength,
    });
  }
  
  // Calcular profundidad requerida
  const requiredDepth = calculateUSBRType2Depth(params);
  if (params.depth < requiredDepth) {
    warnings.push({
      code: 'DEPTH_MARGINAL',
      message: `Profundidad recomendada: ${requiredDepth.toFixed(2)} m`,
      parameter: 'depth',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculations: {
      sequentDepth: calculateSequentDepth(params),
      energyLoss: calculateEnergyLoss(params),
      basinLength: requiredLength,
    },
  };
}
```

---

## Parte 2: Arquitectura de Comandos

### 2.1 Sistema de Comandos (adaptado de Plasticity)

```typescript
// packages/command/src/Command.ts

export abstract class Command {
  readonly name: string;
  protected state: CommandState = 'None';
  protected resources: Disposable[] = [];
  
  abstract execute(): Promise<void>;
  
  cancel(): void {
    this.state = 'Cancelled';
    this.cleanup();
  }
  
  finish(): void {
    this.state = 'Finished';
    this.cleanup();
  }
  
  interrupt(): void {
    this.state = 'Interrupted';
    this.cleanup();
  }
  
  protected cleanup(): void {
    for (const resource of this.resources.reverse()) {
      resource.dispose();
    }
  }
  
  // Register resource for cleanup
  protected resource<T extends Disposable>(r: T): T {
    this.resources.push(r);
    return r;
  }
}

type CommandState = 'None' | 'Executing' | 'Cancelled' | 'Finished' | 'Interrupted';
```

### 2.2 Factory Base (con Tauri)

```typescript
// packages/factory/src/GeometryFactory.ts

export abstract class GeometryFactory<TParams = unknown> {
  protected _params: TParams;
  protected _isDirty = true;
  protected _cachedResult: MeshData | null = null;
  
  constructor(defaults: TParams) {
    this._params = { ...defaults };
  }
  
  // Update single parameter
  set<K extends keyof TParams>(key: K, value: TParams[K]): void {
    if (this._params[key] !== value) {
      this._params[key] = value;
      this._isDirty = true;
      this.onParamChange(key, value);
    }
  }
  
  // Update multiple parameters
  update(partial: Partial<TParams>): void {
    for (const [key, value] of Object.entries(partial)) {
      this.set(key as keyof TParams, value as TParams[keyof TParams]);
    }
  }
  
  // Get preview mesh (cached)
  async preview(): Promise<MeshData> {
    if (!this._isDirty && this._cachedResult) {
      return this._cachedResult;
    }
    
    this._cachedResult = await this.calculate();
    this._isDirty = false;
    return this._cachedResult;
  }
  
  // Override in subclass - calls Tauri
  protected abstract calculate(): Promise<MeshData>;
  
  // Commit to backend
  abstract commit(): Promise<CommitResult>;
  
  // Hook for parameter changes
  protected onParamChange(key: keyof TParams, value: unknown): void {}
}
```

### 2.3 Ejemplo: Factory de Canal Rectangular

```typescript
// packages/factory/src/families/RectangularChannelFactory.ts

export class RectangularChannelFactory extends GeometryFactory<RectangularChannelParams> {
  static readonly ID = 'rectangular-channel';
  
  constructor() {
    super({
      width: 2.0,
      height: 1.5,
      length: 10.0,
      slope: 0.001,
      wallThickness: 0.25,
      baseThickness: 0.30,
      freeboard: 0.30,
      roughness: 0.014,
      hasCover: false,
    });
  }
  
  protected async calculate(): Promise<MeshData> {
    // Llamar a Rust para generar geometría
    return invoke<MeshData>('hydraulic_rectangular_channel_preview', {
      params: this._params,
    });
  }
  
  async commit(): Promise<CommitResult> {
    // Validar antes de commit
    const validation = this.validate();
    if (!validation.isValid) {
      throw new ValidationError(validation.errors);
    }
    
    return invoke<CommitResult>('hydraulic_rectangular_channel_commit', {
      params: this._params,
    });
  }
  
  validate(): HydraulicValidation {
    return validateRectangularChannel(this._params);
  }
  
  // Cálculos hidráulicos en tiempo real
  get hydraulics() {
    return {
      area: this._params.width * this.normalDepth,
      wetPerimeter: this._params.width + 2 * this.normalDepth,
      hydraulicRadius: this.area / this.wetPerimeter,
      velocity: this.manningVelocity,
      discharge: this.manningDischarge,
      froudeNumber: this.froudeNumber,
      criticalDepth: this.criticalDepth,
      normalDepth: this.normalDepth,
    };
  }
  
  private get manningVelocity(): number {
    const n = this._params.roughness;
    const R = this.hydraulics.hydraulicRadius;
    const S = this._params.slope;
    return (1 / n) * Math.pow(R, 2/3) * Math.sqrt(S);
  }
}
```

---

## Parte 3: Sistema de Gizmos

### 3.1 Gizmo Base (React Three Fiber)

```typescript
// packages/gizmo/src/AbstractGizmo.tsx

export interface GizmoProps<T> {
  position: THREE.Vector3;
  value: T;
  onChange: (value: T) => void;
  onCommit: (value: T) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export abstract class AbstractGizmo<T> {
  protected stateMachine: ValueStateMachine<T>;
  
  constructor(initialValue: T) {
    this.stateMachine = new ValueStateMachine(initialValue);
  }
  
  // Subclasses implement the visual representation
  abstract render(): React.ReactNode;
  
  // Handle pointer events
  protected onPointerDown(event: ThreeEvent<PointerEvent>): void {
    this.stateMachine.start();
  }
  
  protected onPointerMove(event: ThreeEvent<PointerEvent>): void {
    const newValue = this.calculateValue(event);
    this.stateMachine.current = newValue;
    this.props.onChange(newValue);
  }
  
  protected onPointerUp(event: ThreeEvent<PointerEvent>): void {
    this.stateMachine.push();
    this.props.onCommit(this.stateMachine.current);
  }
  
  // Keyboard input
  protected onKeyPress(event: KeyboardEvent): void {
    const value = this.parseKeyboardInput(event);
    if (value !== undefined) {
      this.stateMachine.current = value;
      this.props.onChange(value);
    }
  }
  
  // Override in subclasses
  protected abstract calculateValue(event: ThreeEvent<PointerEvent>): T;
  protected abstract parseKeyboardInput(event: KeyboardEvent): T | undefined;
}
```

### 3.2 Gizmos Específicos

```typescript
// packages/gizmo/src/DistanceGizmo.tsx

export function DistanceGizmo({
  position,
  direction,
  value,
  min = 0,
  max = Infinity,
  onChange,
  onCommit,
}: DistanceGizmoProps) {
  const gizmoRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showInput, setShowInput] = useState(false);
  
  const bind = useDrag({
    onDragStart: () => setIsDragging(true),
    onDrag: ({ movement: [, dy], event }) => {
      event.stopPropagation();
      const delta = dy * 0.01;  // Scale factor
      const newValue = Math.max(min, Math.min(max, value + delta));
      onChange(newValue);
    },
    onDragEnd: () => {
      setIsDragging(false);
      onCommit(value);
    },
  });
  
  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDragging) return;
      
      if (/[0-9.]/.test(e.key)) {
        setShowInput(true);
        setInputValue(prev => prev + e.key);
      } else if (e.key === 'Enter' && inputValue) {
        const parsed = parseFloat(inputValue);
        if (!isNaN(parsed)) {
          onChange(parsed);
          onCommit(parsed);
        }
        setShowInput(false);
        setInputValue('');
      } else if (e.key === 'Escape') {
        setShowInput(false);
        setInputValue('');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDragging, inputValue]);
  
  return (
    <group ref={gizmoRef} position={position}>
      {/* Handle (draggable sphere) */}
      <mesh {...bind()}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color={isDragging ? '#ffff00' : '#ff9900'} 
          emissive={isDragging ? '#ffff00' : '#000000'}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Line showing distance */}
      <Line
        points={[[0, 0, 0], direction.clone().multiplyScalar(value).toArray()]}
        color="#ff9900"
        lineWidth={2}
        dashed={isDragging}
      />
      
      {/* Value label */}
      <Html position={direction.clone().multiplyScalar(value / 2).toArray()}>
        <div className="gizmo-label">
          {showInput ? inputValue : value.toFixed(3)} m
        </div>
      </Html>
    </group>
  );
}
```

### 3.3 Gizmo Compuesto para Canal

```typescript
// packages/gizmo/src/composites/ChannelGizmo.tsx

export function ChannelGizmo({
  factory,
  onUpdate,
}: {
  factory: RectangularChannelFactory;
  onUpdate: () => void;
}) {
  const params = factory.params;
  
  return (
    <group>
      {/* Width gizmo (lateral) */}
      <DistanceGizmo
        position={new THREE.Vector3(0, 0, params.height / 2)}
        direction={new THREE.Vector3(1, 0, 0)}
        value={params.width}
        min={0.1}
        onChange={(v) => { factory.set('width', v); onUpdate(); }}
        onCommit={(v) => { factory.set('width', v); onUpdate(); }}
      />
      
      {/* Height gizmo (vertical) */}
      <DistanceGizmo
        position={new THREE.Vector3(params.width / 2, 0, 0)}
        direction={new THREE.Vector3(0, 0, 1)}
        value={params.height}
        min={0.1}
        onChange={(v) => { factory.set('height', v); onUpdate(); }}
        onCommit={(v) => { factory.set('height', v); onUpdate(); }}
      />
      
      {/* Length gizmo (longitudinal) */}
      <DistanceGizmo
        position={new THREE.Vector3(params.width / 2, 0, params.height / 2)}
        direction={new THREE.Vector3(0, 1, 0)}
        value={params.length}
        min={1.0}
        onChange={(v) => { factory.set('length', v); onUpdate(); }}
        onCommit={(v) => { factory.set('length', v); onUpdate(); }}
      />
      
      {/* Slope indicator */}
      <AngleGizmo
        position={new THREE.Vector3(0, params.length / 2, 0)}
        value={Math.atan(params.slope) * (180 / Math.PI)}
        min={0}
        max={10}
        onChange={(v) => { 
          factory.set('slope', Math.tan(v * Math.PI / 180)); 
          onUpdate(); 
        }}
        onCommit={(v) => { 
          factory.set('slope', Math.tan(v * Math.PI / 180)); 
          onUpdate(); 
        }}
      />
    </group>
  );
}
```

---

## Parte 4: Backend Rust

### 4.1 Comandos Tauri para Familias

```rust
// crates/cadhy-hydraulics/src/families/mod.rs

pub mod channels;
pub mod transitions;
pub mod dissipators;
pub mod structures;

// crates/cadhy-hydraulics/src/families/channels/rectangular.rs

use cadhy_cad::primitives;
use cadhy_core::geometry::MeshData;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RectangularChannelParams {
    pub width: f64,
    pub height: f64,
    pub length: f64,
    pub slope: f64,
    pub wall_thickness: f64,
    pub base_thickness: f64,
    pub freeboard: Option<f64>,
    pub roughness: Option<f64>,
    pub has_cover: bool,
}

pub fn generate_rectangular_channel(params: &RectangularChannelParams) -> Result<MeshData, String> {
    // 1. Crear sección transversal (perfil 2D)
    let outer_profile = create_rectangular_profile(
        params.width + 2.0 * params.wall_thickness,
        params.height + params.base_thickness,
    );
    
    let inner_profile = create_rectangular_profile(
        params.width,
        params.height,
    );
    
    // 2. Crear path con pendiente
    let path = create_sloped_path(params.length, params.slope);
    
    // 3. Sweep (barrido) del perfil por el path
    let outer_solid = primitives::sweep(&outer_profile, &path)?;
    let inner_solid = primitives::sweep(&inner_profile, &path)?;
    
    // 4. Boolean cut (restar interior)
    let channel_solid = primitives::boolean_cut(&outer_solid, &inner_solid)?;
    
    // 5. Si tiene tapa, agregar
    let final_solid = if params.has_cover {
        let cover = create_cover(params);
        primitives::boolean_union(&channel_solid, &cover)?
    } else {
        channel_solid
    };
    
    // 6. Teselar para visualización
    let mesh = cadhy_mesh::tessellate(&final_solid, 0.1)?;
    
    Ok(mesh)
}

fn create_rectangular_profile(width: f64, height: f64) -> Wire {
    let half_w = width / 2.0;
    Wire::from_points(&[
        Point3::new(-half_w, 0.0, 0.0),
        Point3::new(half_w, 0.0, 0.0),
        Point3::new(half_w, 0.0, height),
        Point3::new(-half_w, 0.0, height),
        Point3::new(-half_w, 0.0, 0.0),  // Cerrar
    ])
}

fn create_sloped_path(length: f64, slope: f64) -> Wire {
    let drop = length * slope;
    Wire::from_points(&[
        Point3::new(0.0, 0.0, 0.0),
        Point3::new(0.0, length, -drop),
    ])
}
```

### 4.2 Comandos Tauri

```rust
// apps/desktop/src-tauri/src/commands/hydraulics.rs

#[tauri::command]
pub async fn hydraulic_rectangular_channel_preview(
    params: RectangularChannelParams,
) -> Result<MeshData, String> {
    cadhy_hydraulics::families::channels::rectangular::generate_rectangular_channel(&params)
}

#[tauri::command]
pub async fn hydraulic_rectangular_channel_commit(
    params: RectangularChannelParams,
    state: tauri::State<'_, CadState>,
) -> Result<CommitResult, String> {
    let mesh = generate_rectangular_channel(&params)?;
    
    // Registrar en el estado
    let id = uuid::Uuid::new_v4().to_string();
    state.register_object(id.clone(), ObjectType::HydraulicChannel, mesh.clone())?;
    
    Ok(CommitResult {
        id,
        mesh,
        connectors: get_channel_connectors(&params),
    })
}
```

---

## Parte 5: Plan de Implementación

### Fase 1: Infraestructura (Semana 1-2)

- [ ] `packages/command/` - Sistema de comandos
- [ ] `packages/factory/` - Factory base con Tauri
- [ ] `packages/gizmo/` - Gizmos base (Distance, Angle, Length)
- [ ] Undo/Redo con Memento pattern

### Fase 2: Familias Core (Semana 3-4)

- [ ] Canal Rectangular
- [ ] Canal Trapezoidal
- [ ] Canal Circular
- [ ] Transición de Entrada
- [ ] Transición de Salida

### Fase 3: Disipadores (Semana 5-6)

- [ ] Estanque USBR Tipo I
- [ ] Estanque USBR Tipo II
- [ ] Estanque USBR Tipo III
- [ ] Estanque SAF

### Fase 4: Estructuras de Control (Semana 7-8)

- [ ] Vertedero Rectangular
- [ ] Vertedero Ogee
- [ ] Compuerta Deslizante
- [ ] Aforador Parshall

### Fase 5: Snaps y Polish (Semana 9-10)

- [ ] Sistema de snaps completo
- [ ] Conectores entre familias
- [ ] Validaciones hidráulicas
- [ ] UI de parámetros

---

## Resumen

Este plan transforma CADHY en:

1. **CAD Profesional**: Con patrones de Plasticity (Command, Factory, Gizmo)
2. **Especializado en Hidráulica**: 40+ familias paramétricas pre-construidas
3. **Inteligente**: Validaciones automáticas según normativas (USBR, HEC-RAS)
4. **Conectado**: Sistema de conectores para ensamblar sistemas hidráulicos

**Ventaja competitiva**: Ningún CAD ofrece familias hidráulicas paramétricas con cálculos integrados.

---

**Última Actualización**: 2025-12-20
**Versión**: 1.0.0
