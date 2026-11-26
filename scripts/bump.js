#!/usr/bin/env node
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const type = process.argv[2] // major | minor | patch | prerelease
const preid = 'forbidden'

if (!['major', 'minor', 'patch', 'prerelease'].includes(type)) {
  console.error('Usage: node scripts/bump.js <major|minor|patch|prerelease>')
  process.exit(1)
}

const pkgPath = path.join(process.cwd(), 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const oldVersion = pkg.version

const re = /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z]+)\.(\d+))?$/
const m = oldVersion.match(re)
if (!m) {
  console.error(`Cannot parse version "${oldVersion}"`)
  process.exit(1)
}

let [, major, minor, patch, preTag, preNum] = m
major = Number(major)
minor = Number(minor)
patch = Number(patch)

let newVersion

switch (type) {
  case 'major':
    newVersion = `${major + 1}.0.0-${preid}.0`
    break

  case 'minor':
    newVersion = `${major}.${minor + 1}.0-${preid}.0`
    break

  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}-${preid}.0`
    break

  case 'prerelease':
    if (preTag === preid) {
      newVersion = `${major}.${minor}.${patch}-${preid}.${Number(preNum) + 1}`
    } else {
      newVersion = `${major}.${minor}.${patch}-${preid}.0`
    }
    break
}

console.log(`Bumping: ${oldVersion} → ${newVersion}`)

execSync(`npm version ${newVersion} --no-git-tag-version`, { stdio: 'inherit' })
