// Button functionality test using Playwright
const { chromium } = require('playwright');

async function testButtons() {
    console.log('🔍 Starting button functionality test...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Navigate to work order list page
        console.log('📋 Testing work order list page...');
        await page.goto('http://localhost:3000/maintenance/list');
        await page.waitForTimeout(2000);
        
        // Check if buttons exist
        const viewButtons = await page.locator('button:has-text("查看")').count();
        const shareButtons = await page.locator('button:has-text("分享")').count();
        const deleteButtons = await page.locator('button:has-text("刪除")').count();
        
        console.log(`Found ${viewButtons} view buttons`);
        console.log(`Found ${shareButtons} share buttons`);
        console.log(`Found ${deleteButtons} delete buttons`);
        
        // Test if buttons are clickable
        if (viewButtons > 0) {
            console.log('🔍 Testing view button...');
            try {
                await page.locator('button:has-text("查看")').first().click();
                console.log('✅ View button clicked successfully');
            } catch (error) {
                console.log('❌ View button failed:', error.message);
            }
        }
        
        await page.waitForTimeout(1000);
        
        // Test worker management page
        console.log('👷 Testing worker management page...');
        await page.goto('http://localhost:3000/maintenance/workers');
        await page.waitForTimeout(2000);
        
        const editButtons = await page.locator('button:has-text("編輯")').count();
        console.log(`Found ${editButtons} edit buttons`);
        
        if (editButtons > 0) {
            console.log('✏️ Testing edit button...');
            try {
                await page.locator('button:has-text("編輯")').first().click();
                console.log('✅ Edit button clicked successfully');
            } catch (error) {
                console.log('❌ Edit button failed:', error.message);
            }
        }
        
        // Check console errors
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });
        
        await page.waitForTimeout(1000);
        
        if (errors.length > 0) {
            console.log('🚨 Console errors found:');
            errors.forEach(error => console.log(`  - ${error}`));
        } else {
            console.log('✅ No console errors found');
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
        console.log('✅ Test completed');
    }
}

// Run if server is available
testButtons().catch(console.error);