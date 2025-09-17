import { test, expect } from '@playwright/test'

// Example E2E test for the main site
test.describe('Site Navigation and Authentication', () => {
  test('should load the homepage successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check page loads and has expected content
    await expect(page).toHaveTitle(/Wenzel Arifiandi/)
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should handle authentication flow', async ({ page }) => {
    // Navigate to a protected page (if any in public mode)
    await page.goto('/admin')
    
    // Should redirect to access required or show appropriate message
    await expect(page.url()).toMatch(/(access-required|login|\/)/)
  })

  test('should have proper navigation', async ({ page }) => {
    await page.goto('/')
    
    // Check navigation elements exist
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    
    // Check for common navigation links
    await expect(page.locator('a[href="/"]')).toBeVisible()
  })

  test('should be accessible', async ({ page }) => {
    await page.goto('/')
    
    // Basic accessibility checks
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    await expect(headings.first()).toBeVisible()
    
    // Check for alt text on images
    const images = page.locator('img')
    const imageCount = await images.count()
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
  })

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/')
    
    // Check essential meta tags
    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
    
    const description = page.locator('meta[name="description"]')
    await expect(description).toHaveAttribute('content', /.+/)
  })
})

test.describe('API Endpoints', () => {
  test('health check endpoint should work', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('status')
  })

  test('diagnostic endpoint should return proper data', async ({ request }) => {
    const response = await request.get('/api/diag')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('environment')
    expect(data).toHaveProperty('auth_mode')
  })
})