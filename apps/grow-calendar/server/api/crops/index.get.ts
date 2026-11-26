import { getCrops } from '../../utils/crops'
export default defineEventHandler(async event => {
  const crops = await getCrops()
  setHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=300')
  return { crops }
})
