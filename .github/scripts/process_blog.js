const fs = require('fs');
const path = require('path');

// ตั้งค่าจำนวนโพสต์สูงสุดต่อ 1 ไฟล์ (เปลี่ยนได้ตามต้องการ)
const ITEMS_PER_FILE = 200; 

// กำหนด path พื้นฐาน
const ROOT_DIR = path.join(__dirname, '../../');
const DATA_DIR = path.join(ROOT_DIR, 'data/blog'); // โฟลเดอร์สำหรับเก็บไฟล์แบ่งส่วน
const INDEX_FILE = path.join(ROOT_DIR, 'blog_index.json');
const UPDATES_FILE = path.join(ROOT_DIR, 'latest_updates.json');

// สร้างโฟลเดอร์ data/blog/ ถ้ายังไม่มี
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function run() {
    // 1. ตรวจสอบว่ามีไฟล์อัปเดตใหม่จาก n8n หรือไม่
    if (!fs.existsSync(UPDATES_FILE)) {
        console.log("No new updates found. Skipping process.");
        return;
    }

    // 2. โหลดข้อมูลอัปเดตล่าสุด (ที่ n8n ส่งมา)
    const updatesRaw = fs.readFileSync(UPDATES_FILE, 'utf8');
    let updates = [];
    try {
        updates = JSON.parse(updatesRaw);
    } catch (e) {
        console.error("Error parsing latest_updates.json:", e);
        return;
    }

    // 3. โหลดไฟล์ Index เพื่อดูว่ามีไฟล์เก่าอะไรอยู่บ้าง
    let indexData = [];
    if (fs.existsSync(INDEX_FILE)) {
        try {
            indexData = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
        } catch (e) {
            console.error("Error parsing blog_index.json:", e);
        }
    }

    // 4. โหลดข้อมูลเก่าทั้งหมดมารวมกัน และลบไฟล์เก่าทิ้งเตรียมสร้างใหม่
    let allPosts = [];
    indexData.forEach(fileRelativePath => {
        const filePath = path.join(ROOT_DIR, fileRelativePath);
        if (fs.existsSync(filePath)) {
            try {
                const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                allPosts = allPosts.concat(Array.isArray(fileData) ? fileData : fileData.data || []);
            } catch (e) {
                console.error(`Error reading ${filePath}:`, e);
            }
            // ลบไฟล์เก่าออกเพื่อจัดระเบียบใหม่และป้องกันไฟล์ขยะตกค้าง
            fs.unlinkSync(filePath); 
        }
    });

    // 5. สร้าง Map เพื่อ Merge ข้อมูล (เอา ID เป็น Key ป้องกันข้อมูลซ้ำ)
    let postMap = new Map();
    
    // ใส่ข้อมูลเก่าลงไปก่อน
    allPosts.forEach(post => {
        if (post && post.id) postMap.set(post.id, post);
    });
    
    // ใส่ข้อมูลใหม่ทับลงไป (ถ้า ID ซ้ำจะถูกอัปเดต ถ้าเป็น ID ใหม่จะถูกเพิ่ม)
    updates.forEach(post => {
        if (post && post.id) postMap.set(post.id, post);
    });

    // 6. แปลงกลับเป็น Array และเรียงลำดับตามเวลาอัปเดตล่าสุด (ล่าสุดอยู่บน)
    let mergedPosts = Array.from(postMap.values());
    mergedPosts.sort((a, b) => {
        const timeA = new Date(a.property_last_edited_time || 0).getTime();
        const timeB = new Date(b.property_last_edited_time || 0).getTime();
        return timeB - timeA; 
    });

    // 7. ตัดแบ่งข้อมูลเป็นก้อนๆ (Chunking) และบันทึกลงโฟลเดอร์ data/blog/
    let newIndex = [];
    for (let i = 0; i < mergedPosts.length; i += ITEMS_PER_FILE) {
        const chunk = mergedPosts.slice(i, i + ITEMS_PER_FILE);
        const fileName = `research_chunk_${Math.floor(i / ITEMS_PER_FILE) + 1}.json`;
        const relativePath = `data/blog/${fileName}`; // เก็บ path แบบสัมพันธ์
        
        fs.writeFileSync(path.join(ROOT_DIR, relativePath), JSON.stringify(chunk, null, 2));
        newIndex.push(relativePath);
    }

    // 8. อัปเดต blog_index.json ให้ชี้ไปที่ Path ไฟล์ใหม่ทั้งหมด
    fs.writeFileSync(INDEX_FILE, JSON.stringify(newIndex, null, 2));
    

    console.log(`Successfully processed ${mergedPosts.length} posts into ${newIndex.length} files.`);
}

run();
