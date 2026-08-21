/**
 * A stand-in for the Artifact host: wraps the fragment in the same skeleton
 * and minimal reset the real one applies, and stamps `data-theme` on the root
 * the way a viewer's light/dark choice does — so the published page can be
 * tested exactly as it will be served rather than hoped about.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const fragment = readFileSync('dist-single/artifact.html', 'utf8')
const stamp = process.argv[2] ?? 'light'

writeFileSync('dist-single/hosted.html', `<!doctype html>
<html lang="en" data-theme="${stamp}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
</head>
<body>
${fragment}
</body>
</html>
`)
console.log(`hosted.html built with data-theme="${stamp}"`)
