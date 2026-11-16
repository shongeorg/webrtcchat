import {expect, test} from '@playwright/test'

const ROOM = `e2e-${Date.now()}`

async function joinRoom(page, name, room = ROOM) {
  await page.goto('/')
  await page.fill('#name', name)
  await page.fill('#room', room)
  await page.click('button[type="submit"]')
  await expect(page.locator('.chat')).toBeVisible()
}

test.describe('join flow', () => {
  test('shows the join form and enters the room', async ({page}) => {
    await page.goto('/')

    await expect(page.locator('.join-card')).toBeVisible()
    await expect(page.locator('h1')).toHaveText('Вхід у чат')

    await joinRoom(page, 'Аліса')

    await expect(page.locator('.room-name')).toHaveText(ROOM)
    await expect(page.locator('.empty-state')).toContainText('Повідомлень ще немає')
    await expect(page.locator('.sidebar-profile')).toContainText('Аліса')
  })

  test('persists the dark theme after reload', async ({page}) => {
    await page.goto('/')

    await page.getByRole('button', {name: 'Увімкнути темну тему'}).click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })

  test('persists the muted sound setting after reload', async ({page}) => {
    await page.goto('/')

    await page.getByRole('button', {name: 'Вимкнути звук'}).click()

    await expect(page.getByRole('button', {name: 'Увімкнути звук'})).toBeVisible()

    await page.reload()

    await expect(page.getByRole('button', {name: 'Увімкнути звук'})).toBeVisible()
  })

  test('inserts an emoji into the composer', async ({page}) => {
    await joinRoom(page, 'Аліса')

    await page.click('button[aria-label="Емодзі"]')
    await page.locator('.emoji-item').first().click()

    await expect(page.locator('#message')).toHaveValue('😀')
  })

  test('opens the participants drawer on mobile', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844})
    await joinRoom(page, 'Аліса')

    await expect(page.locator('.sidebar')).not.toBeVisible()

    await page.click('button[aria-label="Список учасників"]')

    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.sidebar')).toContainText('Аліса')
  })
})

test.describe('peer to peer chat', () => {
  test('delivers messages between two peers', async ({browser}) => {
    const aliceContext = await browser.newContext()
    const bobContext = await browser.newContext()
    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    await joinRoom(alice, 'Аліса')
    await joinRoom(bob, 'Богдан')

    await expect(alice.locator('.contact-name', {hasText: 'Богдан'})).toBeVisible({timeout: 60000})
    await expect(bob.locator('.contact-name', {hasText: 'Аліса'})).toBeVisible({timeout: 60000})

    await alice.fill('#message', 'Привіт від Аліси')
    await alice.click('.send-btn')

    await expect(bob.locator('.bubble-text', {hasText: 'Привіт від Аліси'})).toBeVisible({timeout: 60000})
    await expect(alice.locator('.ticks')).toHaveClass(/is-read/, {timeout: 60000})

    await bob.fill('#message', 'Привіт у відповідь')
    await bob.click('.send-btn')

    await expect(alice.locator('.bubble-text', {hasText: 'Привіт у відповідь'})).toBeVisible({timeout: 60000})

    await aliceContext.close()
    await bobContext.close()
  })

  test('transfers a file between two peers', async ({browser}) => {
    const aliceContext = await browser.newContext()
    const bobContext = await browser.newContext()
    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    await joinRoom(alice, 'Аліса')
    await joinRoom(bob, 'Богдан')

    await expect(alice.locator('.contact-name', {hasText: 'Богдан'})).toBeVisible({timeout: 60000})
    await expect(bob.locator('.contact-name', {hasText: 'Аліса'})).toBeVisible({timeout: 60000})

    await alice.setInputFiles('input[type="file"]', {
      name: 'note.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello')
    })

    const fileCard = bob.locator('.file-card', {hasText: 'note.txt'})

    await expect(fileCard).toBeVisible({timeout: 60000})
    await expect(fileCard).toContainText('5 Б')
    await expect(fileCard).toHaveAttribute('download', 'note.txt')

    await aliceContext.close()
    await bobContext.close()
  })

  test('starts and ends a video call', async ({browser}) => {
    const aliceContext = await browser.newContext()
    const bobContext = await browser.newContext()
    const alice = await aliceContext.newPage()
    const bob = await bobContext.newPage()

    await joinRoom(alice, 'Аліса')
    await joinRoom(bob, 'Богдан')

    await expect(alice.locator('.contact-name', {hasText: 'Богдан'})).toBeVisible({timeout: 60000})
    await expect(bob.locator('.contact-name', {hasText: 'Аліса'})).toBeVisible({timeout: 60000})

    await alice.click('button[aria-label="Почати дзвінок"]')

    await expect(bob.locator('.call-overlay')).toBeVisible({timeout: 30000})
    await expect(bob.locator('.call-status')).toHaveText('Вхідний дзвінок')

    await bob.click('button[aria-label="Прийняти"]')

    await expect(alice.locator('.call-video')).toBeVisible({timeout: 60000})
    await expect(bob.locator('.call-video')).toBeVisible({timeout: 60000})

    await alice.click('button[aria-label="Завершити"]')

    await expect(alice.locator('.call-overlay')).toHaveCount(0, {timeout: 30000})
    await expect(bob.locator('.call-overlay')).toHaveCount(0, {timeout: 30000})

    await aliceContext.close()
    await bobContext.close()
  })
})
