import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'

// Ciudades principales de México con sus estados
const MEXICO_CITIES = [
  'Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana',
  'León', 'Juárez', 'Zapopan', 'Mérida', 'Cancún',
  'Aguascalientes', 'Querétaro', 'Hermosillo', 'Chihuahua', 'Culiacán',
  'Morelia', 'Toluca', 'Saltillo', 'Victoria', 'Durango',
  'Tepic', 'Campeche', 'Cuernavaca', 'Oaxaca', 'Villahermosa',
  'Tuxtla Gutiérrez', 'La Paz', 'Los Cabos', 'Chetumal', 'Acapulco',
  'Veracruz', 'Reynosa', 'Matamoros', 'Nuevo Laredo', 'Piedras Negras',
  'Torreón', 'Lagos de Moreno', 'Irapuato', 'Celaya', 'San Luis Potosí',
  'Xalapa', 'Tampico', 'Pachuca', 'Tlaxcala', 'Colima',
  'Manzanillo', 'Puerto Vallarta', 'Tlaquepaque', 'Tonalá',
  // Ciudades con Alsuper/Ahorrera
  'Chihuahua', 'Delicias', 'Parral', 'Ojinaga', 'Cuauhtémoc',
  'Saltillo', 'Ramos Arizpe', 'Torreón', 'Gómez Palacio', 'Lerdo',
  'Piedras Negras', 'Monclova', 'Sabinas', 'Nueva Rosita',
  'Monterrey', 'San Pedro Garza García', 'Apodaca', 'Guadalupe',
  'Escobedo', 'Santa Catarina', 'García',
]

export async function GET() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ city: null, state: null, needsOnboarding: true })

    return NextResponse.json({
      city: profile.city,
      state: profile.state,
      country: profile.country || 'México',
      locationDetected: profile.locationDetected,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const body = await req.json()
    const { city, state } = body

    if (!city || typeof city !== 'string' || city.trim().length < 2) {
      return NextResponse.json({ error: 'Ciudad requerida' }, { status: 400 })
    }

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    // Determinar estado basado en la ciudad
    let finalState = state || getStateForCity(city.trim())

    await db.userProfile.update({
      where: { id: profile.id },
      data: {
        city: city.trim(),
        state: finalState,
        country: 'México',
        locationDetected: true,
      },
    })

    return NextResponse.json({
      ok: true,
      location: { city: city.trim(), state: finalState, country: 'México' },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const userId = await getSessionUserId()
    if (!userId) return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })

    const profile = await db.userProfile.findFirst({ where: { userId } })
    if (!profile) return NextResponse.json({ error: 'Sin perfil' }, { status: 400 })

    await db.userProfile.update({
      where: { id: profile.id },
      data: { city: null, state: null, locationDetected: false },
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function getStateForCity(city: string): string {
  const cityToState: Record<string, string> = {
    'Ciudad de México': 'CDMX', 'Guadalajara': 'Jalisco', 'Zapopan': 'Jalisco',
    'Tlaquepaque': 'Jalisco', 'Tonalá': 'Jalisco', 'Puerto Vallarta': 'Jalisco',
    'Monterrey': 'Nuevo León', 'San Pedro Garza García': 'Nuevo León',
    'Apodaca': 'Nuevo León', 'Guadalupe': 'Nuevo León', 'Escobedo': 'Nuevo León',
    'Santa Catarina': 'Nuevo León', 'García': 'Nuevo León',
    'Puebla': 'Puebla', 'Tijuana': 'Baja California', 'Mexicali': 'Baja California',
    'León': 'Guanajuato', 'Irapuato': 'Guanajuato', 'Celaya': 'Guanajuato',
    'Salamanca': 'Guanajuato',
    'Juárez': 'Chihuahua', 'Chihuahua': 'Chihuahua', 'Delicias': 'Chihuahua',
    'Parral': 'Chihuahua', 'Ojinaga': 'Chihuahua', 'Cuauhtémoc': 'Chihuahua',
    'Hermosillo': 'Sonora', 'Culiacán': 'Sinaloa', 'Mazatlán': 'Sinaloa',
    'Mérida': 'Yucatán', 'Cancún': 'Quintana Roo', 'Chetumal': 'Quintana Roo',
    'Playa del Carmen': 'Quintana Roo',
    'Aguascalientes': 'Aguascalientes', 'Querétaro': 'Querétaro',
    'Saltillo': 'Coahuila', 'Ramos Arizpe': 'Coahuila', 'Torreón': 'Coahuila',
    'Gómez Palacio': 'Durango', 'Lerdo': 'Durango', 'Durango': 'Durango',
    'Piedras Negras': 'Coahuila', 'Monclova': 'Coahuila', 'Sabinas': 'Coahuila',
    'Nueva Rosita': 'Coahuila', 'Victoria': 'Tamaulipas',
    'Reynosa': 'Tamaulipas', 'Matamoros': 'Tamaulipas', 'Nuevo Laredo': 'Tamaulipas',
    'Tampico': 'Tamaulipas',
    'Morelia': 'Michoacán', 'Toluca': 'Estado de México',
    'Tepic': 'Nayarit', 'Campeche': 'Campeche', 'Cuernavaca': 'Morelos',
    'Oaxaca': 'Oaxaca', 'Villahermosa': 'Tabasco', 'Tuxtla Gutiérrez': 'Chiapas',
    'La Paz': 'Baja California Sur', 'Los Cabos': 'Baja California Sur',
    'Acapulco': 'Guerrero', 'Veracruz': 'Veracruz', 'Xalapa': 'Veracruz',
    'Pachuca': 'Hidalgo', 'Tlaxcala': 'Tlaxcala', 'Colima': 'Colima',
    'Manzanillo': 'Colima', 'San Luis Potosí': 'San Luis Potosí',
    'Lagos de Moreno': 'Jalisco',
  }
  return cityToState[city] || 'México'
}

export { MEXICO_CITIES }
