import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { loadSyncedProUser } from '@/lib/proSubscription'

interface PubMedArticle {
  pmid: string
  title: string
  abstract: string
  authors: string[]
  journal: string
  year: string
  url: string
}

async function searchPubMed(query: string, maxResults = 5): Promise<PubMedArticle[]> {
  const baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

  // Search for PMIDs
  const searchRes = await fetch(
    `${baseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&sort=relevance&retmode=json`,
    { next: { revalidate: 3600 } }
  )
  const searchData = await searchRes.json()
  const pmids: string[] = searchData?.esearchresult?.idlist ?? []

  if (pmids.length === 0) return []

  // Fetch article details
  const summaryRes = await fetch(
    `${baseUrl}/esummary.fcgi?db=pubmed&id=${pmids.join(',')}&retmode=json`,
    { next: { revalidate: 3600 } }
  )
  const summaryData = await summaryRes.json()
  const result = summaryData?.result ?? {}

  // Fetch abstracts
  const abstractRes = await fetch(
    `${baseUrl}/efetch.fcgi?db=pubmed&id=${pmids.join(',')}&rettype=abstract&retmode=xml`,
    { next: { revalidate: 3600 } }
  )
  const abstractXml = await abstractRes.text()

  // Parse abstracts from XML (simple regex extraction)
  const abstractMap: Record<string, string> = {}
  const pmidMatches = [...abstractXml.matchAll(/<PMID[^>]*>(\d+)<\/PMID>/g)]
  const abstractMatches = [...abstractXml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)]

  pmidMatches.forEach((pmidMatch, i) => {
    const pmid = pmidMatch[1]
    const abstracts = abstractMatches.filter((_, j) => {
      // Rough heuristic: group abstract sections by article order
      return j >= i * 4 && j < (i + 1) * 4
    })
    abstractMap[pmid] = abstracts.map(m => m[1].replace(/<[^>]+>/g, '')).join(' ').slice(0, 800)
  })

  return pmids.map(pmid => {
    const doc = result[pmid] ?? {}
    const authors: string[] = (doc.authors ?? []).slice(0, 3).map((a: { name: string }) => a.name)
    const year = doc.pubdate?.split(' ')[0] ?? '—'
    return {
      pmid,
      title: doc.title ?? 'Sin título',
      abstract: abstractMap[pmid] ?? 'Abstract no disponible.',
      authors,
      journal: doc.fulljournalname ?? doc.source ?? '—',
      year,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    }
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  const usuario = session ? await loadSyncedProUser(session.userId) : null
  if (!usuario?.isPro) {
    return NextResponse.json({ error: 'Se requiere plan Pro' }, { status: 403 })
  }

  try {
    const { query } = await req.json()
    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query requerido' }, { status: 400 })
    }

    const papers = await searchPubMed(query, 5)
    return NextResponse.json({ papers })
  } catch (err) {
    console.error('[sidebar/papers]', err)
    return NextResponse.json({ error: 'Error al buscar papers' }, { status: 500 })
  }
}
