import JSZip from 'jszip'
import { toDemoItems } from '../data/demo'
import { downloadMyDataZip } from './authApi'
import { listCloudProjects, restoreCloudProject } from './api'
import { exportFileName, imageStyleForItem, renderItemToPng, textOverlaysForItem } from './exportImage'
import { restoreFile, restoreStyles } from './workspaceRestore'

export type AccountExportProgress =
  | { phase: 'collect' }
  | { phase: 'render'; done: number; total: number }
  | { phase: 'pack' }

export interface AccountExportResult {
  blob: Blob
  fileName: string
  /** 완성 이미지를 만들지 못한 프로젝트 이름 */
  renderFailures: string[]
}

/**
 * "내 컴퓨터로 받기": 서버가 만든 계정 ZIP(원본·글자 지운 이미지·번역·생성 이미지)을 받고,
 * 결과가 있는 현지화 프로젝트마다 다운로드 버튼과 같은 엔진으로 완성 이미지를 합성해 final/<언어>/에 더한다.
 * 프로젝트 하나를 합성하지 못해도 나머지는 계속하고, README에 적는다.
 */
export async function buildAccountExport(token: string, onProgress: (progress: AccountExportProgress) => void): Promise<AccountExportResult> {
  onProgress({ phase: 'collect' })
  const [zip, { projects }] = await Promise.all([downloadMyDataZip(token).then(blob => JSZip.loadAsync(blob)), listCloudProjects()])
  const ready = projects.filter(project => project.resultReady)
  const renderFailures: string[] = []

  for (const [index, project] of ready.entries()) {
    onProgress({ phase: 'render', done: index, total: ready.length })
    try {
      // 서버 ZIP의 프로젝트 폴더 이름(<이름>_<id 앞 8자>)을 그대로 따라간다.
      const folder = Object.keys(zip.files).find(name => name.startsWith('localization/') && name.endsWith(`_${project.id.slice(0, 8)}/project.json`))?.replace(/project\.json$/, '')
      if (!folder) throw new Error('project folder missing')
      const workspace = await restoreCloudProject(project.id)
      const languageCodes = workspace.results.targetLanguages
      const completedAssets = new Set(workspace.results.assets.filter(asset => asset.status === 'completed').map(asset => asset.id))
      const files = workspace.files
        .filter(file => completedAssets.has(file.assetId))
        .map(file => restoreFile({ ...file, url: undefined }, workspace.results, languageCodes))
      // 파일이 없으면 toDemoItems가 데모 샘플을 돌려주므로 건너뛴다.
      if (files.length === 0) continue
      const styles = restoreStyles(files, workspace.results, languageCodes)
      for (const languageCode of languageCodes) {
        for (const [itemIndex, item] of toDemoItems(files, languageCode).entries()) {
          const png = await renderItemToPng(item, imageStyleForItem(item, languageCode, styles), textOverlaysForItem(item, languageCode, styles))
          zip.file(`${folder}final/${languageCode}/${String(itemIndex + 1).padStart(2, '0')}_${exportFileName(item.name, languageCode, 'png')}`, png)
        }
      }
    } catch {
      renderFailures.push(project.name || project.id)
    }
  }

  if (renderFailures.length > 0) {
    const readme = await zip.file('README.txt')?.async('string') ?? ''
    zip.file('README.txt', `${readme}\n완성 이미지를 만들지 못한 프로젝트 / Projects without finished images:\n${renderFailures.map(name => `- ${name}`).join('\n')}\n`)
  }
  onProgress({ phase: 'pack' })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return { blob: await zip.generateAsync({ type: 'blob' }), fileName: `glocalizer-my-data-${date}.zip`, renderFailures }
}
