export interface SpecBubble {
  id: string;
  label: string;
  value: string;
  iconType: 'displacement' | 'power' | 'brakes' | 'fuel' | 'transmission' | 'tank' | 'speed' | 'custom';
  highlight?: boolean;
}

export interface MotorcycleTelemetry {
  displacement: string;
  power: string;
  torque: string;
  brakes: string;
  fuelSystem: string;
  cooling: string;
  transmission: string;
  tankCapacity: string;
  segment: string;
  highlights: string[];
  bubbles: SpecBubble[];
}

/**
 * Intelligent spec resolver that extracts realistic technical specifications
 * or uses custom product-configured specs.
 */
export function getMotorcycleSpecs(
  productName: string,
  brand?: string,
  model?: string,
  category?: string,
  customSpecs?: any
): MotorcycleTelemetry {
  const fullText = `${brand || ''} ${model || ''} ${productName || ''} ${category || ''}`.toUpperCase();

  // If the product has custom configured specs
  if (customSpecs && typeof customSpecs === 'object') {
    const customList: SpecBubble[] = [];
    if (Array.isArray(customSpecs)) {
      customSpecs.forEach((s: any, idx: number) => {
        if (s.label && s.value) {
          customList.push({
            id: `custom-${idx}`,
            label: s.label,
            value: s.value,
            iconType: s.iconType || 'custom',
            highlight: s.highlight,
          });
        }
      });
    } else {
      Object.entries(customSpecs).forEach(([key, val], idx) => {
        if (val) {
          customList.push({
            id: `custom-${idx}`,
            label: key,
            value: String(val),
            iconType: 'custom',
          });
        }
      });
    }

    if (customList.length > 0) {
      return {
        displacement: customSpecs.displacement || customSpecs['Cilindrada'] || '250 cc',
        power: customSpecs.power || customSpecs['Potencia'] || '24 HP',
        torque: customSpecs.torque || customSpecs['Torque'] || '20 Nm',
        brakes: customSpecs.brakes || customSpecs['Frenos'] || 'ABS Doble Canal',
        fuelSystem: customSpecs.fuelSystem || customSpecs['Alimentación'] || 'Inyección Electrónica FI',
        cooling: customSpecs.cooling || customSpecs['Refrigeración'] || 'Líquida',
        transmission: customSpecs.transmission || customSpecs['Transmisión'] || '6 Velocidades',
        tankCapacity: customSpecs.tankCapacity || customSpecs['Tanque'] || '13 Litros',
        segment: customSpecs.segment || 'EDICIÓN OFICIAL',
        highlights: customSpecs.highlights || ['Garantía de Fábrica', 'Entrega Inmediata'],
        bubbles: customList,
      };
    }
  }

  // 400cc class (NS 400 / Dominar 400)
  if (fullText.includes('400') || fullText.includes('NS 400') || fullText.includes('NS400')) {
    const displacement = '373.2 cc';
    const power = '40.0 HP @ 8,800 RPM';
    const brakes = 'ABS Doble Canal';
    const fuelSystem = 'Inyección FI Bosch';
    const transmission = '6 Vel. + Antirrebote';
    return {
      displacement,
      power,
      torque: '35.0 Nm @ 6,500 RPM',
      brakes: 'Doble Disco + ABS Doble Canal',
      fuelSystem: 'Inyección Electrónica FI Bosch',
      cooling: 'Refrigeración Líquida',
      transmission,
      tankCapacity: '13 Litros',
      segment: 'SUPERSPORT NAKED',
      highlights: ['Ride-by-wire', 'Control de Tracción TC', 'Display Bluetooth', 'Horquilla Invertida USD'],
      bubbles: [
        { id: '1', label: 'CILINDRADA', value: '373.2 cc', iconType: 'displacement', highlight: true },
        { id: '2', label: 'POTENCIA', value: '40.0 HP', iconType: 'power' },
        { id: '3', label: 'FRENOS', value: 'ABS Doble Canal', iconType: 'brakes' },
        { id: '4', label: 'SISTEMA', value: 'Inyección Bosch FI', iconType: 'fuel' },
      ],
    };
  }

  // 250cc class
  if (fullText.includes('250')) {
    return {
      displacement: '248.8 cc',
      power: '27.0 HP @ 8,500 RPM',
      torque: '23.5 Nm @ 6,500 RPM',
      brakes: 'Disco Delantero y Trasero + ABS',
      fuelSystem: 'Inyección Electrónica FI',
      cooling: 'Refrigeración Líquida / Aceite',
      transmission: '6 Velocidades',
      tankCapacity: '13 Litros',
      segment: 'STREET / TOURING 250',
      highlights: ['Frenos ABS', 'Full LED', 'Monoshock Nitrox', 'Tablero Digital'],
      bubbles: [
        { id: '1', label: 'CILINDRADA', value: '248.8 cc', iconType: 'displacement', highlight: true },
        { id: '2', label: 'POTENCIA', value: '27.0 HP', iconType: 'power' },
        { id: '3', label: 'FRENOS', value: 'Doble Disco ABS', iconType: 'brakes' },
        { id: '4', label: 'INYECCIÓN', value: 'Electrónica FI', iconType: 'fuel' },
      ],
    };
  }

  // 200cc class (Pulsar NS 200, RS 200)
  if (fullText.includes('200') || fullText.includes('NS 200') || fullText.includes('RS 200')) {
    return {
      displacement: '199.5 cc',
      power: '24.5 HP @ 9,750 RPM',
      torque: '18.7 Nm @ 8,000 RPM',
      brakes: 'Disco Delantero + Trasero ABS',
      fuelSystem: 'Triple Chispa DTS-i FI',
      cooling: 'Refrigeración Líquida',
      transmission: '6 Velocidades',
      tankCapacity: '12 Litros',
      segment: 'SPORT NAKED 200',
      highlights: ['Triple Chispa 4V', 'Chasis Perimetral', 'Frenos ByBre', 'Escape Venturi'],
      bubbles: [
        { id: '1', label: 'CILINDRADA', value: '199.5 cc', iconType: 'displacement', highlight: true },
        { id: '2', label: 'POTENCIA', value: '24.5 HP', iconType: 'power' },
        { id: '3', label: 'FRENOS', value: 'Disco ABS ByBre', iconType: 'brakes' },
        { id: '4', label: 'SISTEMA', value: 'Triple Chispa DTS-i', iconType: 'fuel' },
      ],
    };
  }

  // 160cc / 150cc class
  if (fullText.includes('160') || fullText.includes('150')) {
    return {
      displacement: '160.3 cc',
      power: '16.0 HP @ 8,500 RPM',
      torque: '14.6 Nm @ 6,500 RPM',
      brakes: 'Disco con ABS + Disco Trasero',
      fuelSystem: 'Inyección FI / Carburado',
      cooling: 'Refrigeración por Aire/Aceite',
      transmission: '5 Velocidades',
      tankCapacity: '12 Litros',
      segment: 'URBANA SPORT',
      highlights: ['Excelente Autonomía', 'Horquilla Reforzada', 'Luces LED'],
      bubbles: [
        { id: '1', label: 'CILINDRADA', value: '160.3 cc', iconType: 'displacement', highlight: true },
        { id: '2', label: 'POTENCIA', value: '16.0 HP', iconType: 'power' },
        { id: '3', label: 'FRENOS', value: 'Disco Delantero ABS', iconType: 'brakes' },
        { id: '4', label: 'CONSUMO', value: '~45 km/Litro', iconType: 'fuel' },
      ],
    };
  }

  // 125cc / 110cc / 100cc class
  if (fullText.includes('125') || fullText.includes('110') || fullText.includes('100')) {
    return {
      displacement: '124.4 cc',
      power: '11.8 HP @ 8,500 RPM',
      torque: '10.8 Nm @ 6,500 RPM',
      brakes: 'Disco CBS / Tambor',
      fuelSystem: 'Carburador DTS-i',
      cooling: 'Refrigeración por Aire',
      transmission: '5 Velocidades',
      tankCapacity: '11.5 Litros',
      segment: 'URBANA / TRABAJO',
      highlights: ['Ultra Económica (~50 km/L)', 'Chasis Reforzado', 'Repuestos Económicos'],
      bubbles: [
        { id: '1', label: 'CILINDRADA', value: '124.4 cc', iconType: 'displacement', highlight: true },
        { id: '2', label: 'POTENCIA', value: '11.8 HP', iconType: 'power' },
        { id: '3', label: 'RENDIMIENTO', value: '~50 km/Litro', iconType: 'fuel' },
        { id: '4', label: 'TRANSMISIÓN', value: '5 Velocidades', iconType: 'brakes' },
      ],
    };
  }

  // Generic Default
  return {
    displacement: '250 cc',
    power: '24.0 HP @ 8,500 RPM',
    torque: '20.0 Nm @ 6,500 RPM',
    brakes: 'Doble Disco con ABS',
    fuelSystem: 'Inyección Electrónica FI',
    cooling: 'Refrigeración Líquida',
    transmission: '5 a 6 Velocidades',
    tankCapacity: '12 Litros',
    segment: 'EDICIÓN OFICIAL',
    highlights: ['Garantía 12 Meses', 'Entrega Inmediata', 'Trámite de Placas'],
    bubbles: [
      { id: '1', label: 'MOTOR', value: '4 Tiempos DOHC', iconType: 'displacement', highlight: true },
      { id: '2', label: 'FRENOS', value: 'Doble Disco ABS', iconType: 'brakes' },
      { id: '3', label: 'SISTEMA', value: 'Inyección FI', iconType: 'fuel' },
      { id: '4', label: 'GARANTÍA', value: '12 Meses Oficial', iconType: 'power' },
    ],
  };
}
