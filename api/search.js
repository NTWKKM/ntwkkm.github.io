// นี่คือ Vercel Serverless Function (ทำงานบน Server)
export default async function handler(req, res) {
    // 1. รับค่า "hn" ที่ถูกส่งมาจาก Frontend (ผ่าน URL query)
    const { hn } = req.query;

    if (!hn) {
        return res.status(400).json({ error: 'กรุณาระบุ HN' });
    }

    // 2. นี่คือ API จริงของโรงพยาบาล
    const TARGET_URL = "http://49.231.247.56/iReportAG/Result/Mng_Action/Search";

    // 3. สร้าง Payload (หีบห่อข้อมูล) ที่ Server โรงพยาบาลต้องการ
    // (ใช้รูปแบบเดียวกับที่เราวิเคราะห์ได้จากเว็บต้นฉบับ)
    const payloadData = {
        SearchVal: hn,
        SearchFld: "hn",
        DateOpt: "3",   // ค้นหา 3 วัน (ปรับค่าได้ตามต้องการ)
        LabGrp: "0",
        Sts: "3",
        WardNo: ""
    };

    // 4. แปลง Payload เป็น 'application/x-www-form-urlencoded'
    const formData = new URLSearchParams();
    formData.append("cmd", "RequestSearch");
    formData.append("data", JSON.stringify(payloadData));

    try {
        // 5. ยิง Request จาก Server ของ Vercel ไปยัง Server โรงพยาบาล
        // (ขั้นตอนนี้ไม่มีปัญหา CORS เพราะเป็นการคุยระหว่าง Server-to-Server)
        const apiResponse = await fetch(TARGET_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: formData.toString()
        });

        if (!apiResponse.ok) {
            // ถ้า Server โรงพยาบาลตอบกลับมามีปัญหา
            throw new Error(`API โรงพยาบาลมีปัญหา: ${apiResponse.status} ${apiResponse.statusText}`);
        }

        // 6. รับข้อมูล JSON กลับมาจาก API โรงพยาบาล
        const data = await apiResponse.json();

        // 7. (สำคัญ) ตั้งค่า Header เพื่ออนุญาตให้ 'localhost' (เครื่องคุณ)
        // หรือ Domain อื่นๆ เรียกใช้ API นี้ได้ในอนาคต (ถ้าจำเป็น)
        res.setHeader('Access-Control-Allow-Origin', '*'); 
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // 8. ส่งข้อมูลที่ได้กลับไปให้ Frontend ของคุณ
        res.status(200).json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        // 9. ส่งข้อความ Error กลับไปให้ Frontend
        res.status(500).json({ error: 'Proxy ล้มเหลว', details: error.message });
    }
}
