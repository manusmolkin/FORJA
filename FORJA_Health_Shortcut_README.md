# FORJA Health — Atajo iOS

## Cómo configurar el Atajo de iOS

### Acciones en orden (app Atajos > + > Nueva automatización o Atajo nuevo):

1. **Obtener muestras de salud**
   - Tipo: Pasos (HKQuantityTypeIdentifierStepCount)
   - Período: Últimos 30 días
   - Guardar en variable: "Pasos"

2. **Obtener muestras de salud**
   - Tipo: Frecuencia cardíaca
   - Período: Últimos 30 días
   - Guardar en variable: "FrecuenciaCardiaca"

3. **Obtener muestras de salud**
   - Tipo: Variabilidad de la frecuencia cardíaca (VFC)
   - Período: Últimos 30 días
   - Guardar en variable: "HRV"

4. **Obtener muestras de salud**
   - Tipo: Sueño
   - Período: Últimos 30 días
   - Guardar en variable: "Sueno"

5. **Obtener muestras de salud**
   - Tipo: Calorías activas
   - Período: Últimos 30 días
   - Guardar en variable: "Calorias"

6. **Obtener muestras de salud**
   - Tipo: Saturación de oxígeno (SpO2)
   - Período: Últimos 30 días
   - Guardar en variable: "SpO2"

7. **Obtener muestras de salud**
   - Tipo: Peso corporal
   - Período: Últimos 30 días
   - Guardar en variable: "Peso"

8. **Combinar** todas las variables anteriores
   - Separador: Nueva línea
   - Formato: JSON
   - Guardar en: "DatosCombinados"

9. **Codificar** DatosCombinados
   - Codificación: Base64
   - Guardar en: "DatosBase64"

10. **Abrir URL**
    - URL: `TU_URL_FORJA/?healthdata=[DatosBase64]`
    - Reemplazá TU_URL_FORJA por la URL donde tenés tu FORJA (ej: https://tudominio.com/forja o el path local)

---

## Automatización nocturna

1. App Atajos → pestaña **Automatización**
2. **Nueva automatización personal**
3. **Hora del día** → elegí tu hora de dormir (ej: 22:30)
4. **Ejecutar inmediatamente** (sin preguntar)
5. Acción: **Ejecutar atajo** → "FORJA Health"

---

## Notas

- Los datos se importan automáticamente al abrir FORJA desde el Shortcut
- Aparece un toast verde confirmando cuántas lecturas se importaron
- Si FORJA está como archivo local en tu Mac/PC, el Shortcut no puede abrirlo directamente. En ese caso usá el modo de pegar JSON manualmente en Config → Apple Health Sync.
- La URL recibe el parámetro `?healthdata=` con los datos en Base64. FORJA los decodifica y guarda silenciosamente.
