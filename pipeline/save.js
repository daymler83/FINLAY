/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function saveMedicamento(base, aiData) {
  const data = {
    nombre:             base.nombre,
    principioActivo:    base.principioActivo    || '',
    presentacion:       base.presentacion       || '',
    laboratorio:        base.laboratorio        || '',
    familia:            aiData.familia          || '',
    indicaciones:       aiData.indicaciones     || [],
    efectosAdversos:    aiData.efectosAdversos  || [],
    contraindicaciones: aiData.contraindicaciones || [],
    vidaMedia:          aiData.vidaMedia        ?? null,
    nivelInteracciones: aiData.nivelInteracciones ?? null,
    precioReferencia:   aiData.precioReferencia  ?? null,
  }

  return await prisma.medicamento.upsert({
    where:  { nombre: data.nombre },
    create: data,
    update: {
      familia:            data.familia,
      indicaciones:       data.indicaciones,
      efectosAdversos:    data.efectosAdversos,
      contraindicaciones: data.contraindicaciones,
      vidaMedia:          data.vidaMedia,
      nivelInteracciones: data.nivelInteracciones,
      precioReferencia:   data.precioReferencia,
    },
  })
}

module.exports = { saveMedicamento }
