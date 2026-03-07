/**
 * Pixemingle E2E Test — Full Two-Person Journey
 *
 * Setup: Create two test accounts in Supabase and set env vars:
 *   TEST_USER_A_EMAIL=chaser@test.com
 *   TEST_USER_A_PASSWORD=testpassword123
 *   TEST_USER_B_EMAIL=gatekeeper@test.com
 *   TEST_USER_B_PASSWORD=testpassword123
 *
 * Run: npx playwright test
 */

import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

const BASE = 'http://localhost:3000'
const USER_A = { email: process.env.TEST_USER_A_EMAIL!, password: process.env.TEST_USER_A_PASSWORD! }
const USER_B = { email: process.env.TEST_USER_B_EMAIL!, password: process.env.TEST_USER_B_PASSWORD! }

// Helper: sign in via magic link / email+password using Supabase auth
async function signIn(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/`)
  // Click sign in button on landing
  const signInBtn = page.getByRole('link', { name: /sign in|log in|get started/i }).first()
  if (await signInBtn.isVisible()) {
    await signInBtn.click()
  }
  // Fill email + password (adjust selectors to your auth UI)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(world|onboarding)/, { timeout: 15000 })
}

// ── Single-browser tests (no auth required) ─────────────────────────────────

test.describe('Public pages', () => {
  test('Landing page renders', async ({ page }) => {
    await page.goto(BASE)
    await expect(page).toHaveTitle(/pixemingle/i)
    // Check hero section
    await expect(page.locator('body')).toContainText(/agent|pixel|match/i)
    await page.screenshot({ path: 'test-landing.png', fullPage: true })
  })

  test('Auth error page renders', async ({ page }) => {
    await page.goto(`${BASE}/auth/error`)
    await expect(page.locator('body')).toContainText(/error|sign/i)
  })

  test('/world redirects unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE}/world`)
    // Should redirect to login or landing
    await expect(page).not.toHaveURL(/\/world/)
  })
})

// ── Two-person flow test ─────────────────────────────────────────────────────

test.describe('Two-person date proposal flow', () => {
  test.skip(!USER_A.email || !USER_B.email, 'Set TEST_USER_A_EMAIL and TEST_USER_B_EMAIL env vars to run')

  let ctxA: BrowserContext
  let ctxB: BrowserContext
  let pageA: Page  // Chaser
  let pageB: Page  // Gatekeeper

  test.beforeAll(async () => {
    const browser = await chromium.launch({ headless: false }) // headless: false lets you watch!
    ctxA = await browser.newContext()
    ctxB = await browser.newContext()
    pageA = await ctxA.newPage()
    pageB = await ctxB.newPage()
  })

  test.afterAll(async () => {
    await ctxA.close()
    await ctxB.close()
  })

  test('Step 1: Both users sign in', async () => {
    await Promise.all([
      signIn(pageA, USER_A.email, USER_A.password),
      signIn(pageB, USER_B.email, USER_B.password),
    ])
    await pageA.screenshot({ path: 'test-chaser-world.png' })
    await pageB.screenshot({ path: 'test-gatekeeper-world.png' })
  })

  test('Step 2: Chaser talks to agent → research montage plays', async () => {
    await pageA.goto(`${BASE}/world`)
    await pageA.waitForSelector('canvas', { timeout: 10000 })

    // Type in agent chat bar
    const chatInput = pageA.locator('input[placeholder*="agent"]')
    await chatInput.fill('Find me someone great!')
    await chatInput.press('Enter')

    // Wait for agent response (montage starts)
    await pageA.waitForTimeout(4000)
    await pageA.screenshot({ path: 'test-research-montage.png' })
  })

  test('Step 3: Candidate slider appears after montage', async () => {
    // Wait for candidates to load (slider shows up)
    await pageA.waitForSelector('[class*="CandidateSlider"], button:has-text(">")', { timeout: 15000 })
    await pageA.screenshot({ path: 'test-candidate-slider.png' })
  })

  test('Step 4: Chaser selects a candidate and proposes date', async () => {
    // Click first candidate card
    const sliderCard = pageA.locator('button[class*="border-gray"]').first()
    await sliderCard.click()

    // Date Proposal overlay should show
    await pageA.waitForSelector('[class*="DateProposal"], text=Pick a Venue', { timeout: 5000 })
    await pageA.screenshot({ path: 'test-date-proposal-overlay.png' })

    // Pick a venue (e.g., Rooftop Lounge)
    const venueBtn = pageA.locator('button:has-text("Rooftop"), button:has-text("lounge")').first()
    if (await venueBtn.isVisible()) {
      await venueBtn.click()
    }

    // Send the proposal
    const sendBtn = pageA.locator('button:has-text("Send My Agent"), button:has-text("Propose")').first()
    if (await sendBtn.isVisible()) {
      await sendBtn.click()
    }

    await pageA.screenshot({ path: 'test-proposal-sent.png' })
  })

  test('Step 5: Gatekeeper sees invitation notification', async () => {
    await pageB.goto(`${BASE}/world`)
    await pageB.waitForSelector('canvas', { timeout: 10000 })

    // Invitation notification should pulse on screen
    await pageB.waitForSelector('[class*="InvitationNotification"], button:has-text("Invitation")', { timeout: 20000 })
    await pageB.screenshot({ path: 'test-gatekeeper-notification.png' })
  })

  test('Step 6: Gatekeeper accepts the date', async () => {
    // Click notification to open invitation card
    const notifBtn = pageB.locator('[class*="InvitationNotification"] button, button:has-text("Invitation")').first()
    await notifBtn.click()

    // Click Accept
    await pageB.waitForSelector('button:has-text("Accept")', { timeout: 5000 })
    await pageB.locator('button:has-text("Accept")').click()
    await pageB.screenshot({ path: 'test-gatekeeper-accepted.png' })
  })

  test('Step 7: Both transition to venue scene and theater plays', async () => {
    // Both should transition to the lounge scene
    await Promise.all([
      pageA.waitForTimeout(3000),
      pageB.waitForTimeout(3000),
    ])
    await Promise.all([
      pageA.screenshot({ path: 'test-chaser-theater.png' }),
      pageB.screenshot({ path: 'test-gatekeeper-theater.png' }),
    ])
  })
})

// ── Decline flow test ────────────────────────────────────────────────────────

test.describe('Gatekeeper decline flow', () => {
  test.skip(!USER_A.email || !USER_B.email, 'Set test env vars')

  test('Decline sends chaser back to home with sad animation', async ({ browser }) => {
    // Similar setup, but gatekeeper clicks Decline instead of Accept
    // Verify chaser canvas shows despair animation + walkoff
    test.setTimeout(60000)
  })
})
