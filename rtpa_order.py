import requests
import sys
import os
from datetime import datetime
import json
import math

# --- 1. CONFIGURATION ---
# URL ของเซิร์ฟเวอร์ Lab เพื่อดึงชื่อ (The only external dependency)
LAB_SERVER_URL = "http://192.168.41.110/labmnrhs/sql/getFullname.php"

# --- 2. FUNCTIONALITY ---

def get_patient_name(hn):
    """ส่งคำขอไปยังเซิร์ฟเวอร์ Lab เพื่อดึงชื่อผู้ป่วย"""
    try:
        payload = {'ahn': hn}
        # Timeout 5 วินาที สำหรับการเชื่อมต่อภายใน
        response = requests.post(LAB_SERVER_URL, data=payload, timeout=5) 
        
        if response.status_code == 200:
            data = response.json()
            if data and len(data) > 0:
                patient_name = data[0].get('ptName', 'ไม่พบชื่อ')
                # ดักค่า 'x' ที่เซิร์ฟเวอร์ส่งกลับมาเมื่อไม่พบ HN
                if patient_name == 'x' or patient_name == '':
                    return "ไม่พบชื่อคนไข้"
                return patient_name
        
        return "ไม่สามารถดึงชื่อ (HTTP Error)"

    except requests.exceptions.ConnectionError:
        return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ Lab"
    except requests.exceptions.JSONDecodeError:
        return "ข้อผิดพลาด: ข้อมูลที่ได้รับไม่ใช่ JSON"
    except requests.exceptions.Timeout:
        return "เชื่อมต่อ Lab Timeout"
    except Exception:
        return "ข้อผิดพลาดที่ไม่ทราบสาเหตุ"

def calculate_rtpa_dose(weight, regimen):
    """คำนวณขนาดยา rt-PA ตามน้ำหนักและ Regimen"""
    
    dose_per_kg = regimen
    total_dose_max = 90 # Max dose 90 mg

    calculated_total = weight * dose_per_kg
    total_dose = min(calculated_total, total_dose_max)
    
    if regimen == 0.9:
        push_percent = 10
        drip_percent = 90
    else: # regimen 0.6
        push_percent = 15
        drip_percent = 85
    
    # คำนวณ Dose IV Push (ปัดลงให้เป็นทศนิยม 1 ตำแหน่ง)
    ideal_push = total_dose * (push_percent / 100)
    push_dose = math.floor(ideal_push * 10) / 10
    
    # คำนวณ Dose IV Drip โดยรวมส่วนที่ปัดลงของ Push เข้าไปด้วย
    drip_dose = (total_dose - push_dose)
    
    return {
        'regimen': f"{regimen:.1f}",
        'total_dose': total_dose,
        'push_percent': push_percent,
        'push_dose': push_dose,
        'drip_percent': drip_percent,
        'drip_dose': drip_dose
    }

def print_order_sheet(hn, weight, patient_name, dose_data):
    """สร้างและแสดงใบสั่งยาในรูปแบบข้อความเพื่อเลียนแบบตาราง"""
    
    # --- เตรียมข้อมูล ---
    now = datetime.now()
    order_date_time = now.strftime("%d/%m/%Y %H:%M น.")
    
    regimen_text = f"Alteplase (dose {dose_data['regimen']} mg/kg)"
    total_dose_text = f"Total dose = {dose_data['total_dose']:.2f} mg"
    push_dose_text = f"- {dose_data['push_percent']}% of total dose = {dose_data['push_dose']:.1f} mg IV push in 1 min"
    drip_dose_text = f"- {dose_data['drip_percent']}% of total dose = {dose_data['drip_dose']:.2f} mg IV drip in 60 min"


    # --- เริ่มพิมพ์ใบสั่งยา ---
    print("\n" + "="*80)
    print(" DOCTOR ORDER & PROGRESS NOTE ".center(80))
    print(" Maharat Nakhon Ratchasima Hospital ".center(80))
    print("="*80)
    
    # --- 5 Column Header Mimic ---
    # Col 1: Progress note
    # Col 2: Date/Time (One Day)
    # Col 3: Orders for one day
    # Col 4: Date/Time (Continuation)
    # Col 5: Order for Continuation
    
    print("| Progress note สหสาขาวิชาชีพ(ต้องบันทึก 3 วันหลัง admit และทุกครั้ง...) | Date/Time | Orders for one day ".ljust(38) + "| Date/Time | Order for Continuation ".ljust(22) + "|")
    print("+" + "-"*48 + "+" + "-"*10 + "+" + "-"*38 + "+" + "-"*10 + "+" + "-"*35 + "+")

    # --- Row 1: rt-PA Order ---
    
    # Col 1: Patient Info
    col1_info = (
        f"HN: {hn} (ชื่อ: {patient_name})\n"
        f"น้ำหนัก: {weight:.2f} Kg\n\n"
        f"ลงชื่อเภสัช: ....................."
    )
    
    # Col 3: Orders for one day (rt-PA details and pre/post orders)
    col3_orders_day = [
        "ก่อนให้ rt-PA if SBP ≥ 185 or DBP ≥ 110 mmHg notify แพทย์ทันที",
        f"**{regimen_text}**",
        f" - {total_dose_text}",
        f" - {push_dose_text}",
        f" - {drip_dose_text}",
        "หลังให้ rt-PA if SBP > 180 or DBP > 105 mmHg notify แพทย์ทันที",
        "ห้ามใส่ NG ภายใน 24 hr แรก ถ้าไม่มีเหตุจำเป็นฉุกเฉิน",
        "ห้ามใส่ Foley’s catheter หรือ central line ภายใน 8 hr ถ้าไม่มีเหตุจำเป็นฉุกเฉิน",
        "Notify แพทย์ if มีอาการแพ้ยา/เลือดออก/ปวดศีรษะรุนแรง/GCS drop/อาเจียน",
        "CXR ก่อน admit",
        "Admit"
    ]
    
    # Col 5: Order for Continuation (Long list)
    col5_orders_cont = [
        "NPO",
        "Bed rest 24 hr",
        "Record BP ระหว่างให้ rt-PA:",
        " - q 15 min x 2 hr then",
        " - q 30 min x 6 hr then",
        " - q 1 hr จนครบ 24 hr then",
        " - record as usual",
        "Record NIHSS ก่อน/หลัง rt-PA Then OD หรือ เมื่อมีอาการเปลี่ยนแปลง",
        "Record other VS, I/O(ml), GCS, Warning sign as usual",
    ]
    
    # Find max height for all cells
    max_height = max(
        col1_info.count('\n') + 1,
        len(col3_orders_day),
        len(col5_orders_cont)
    )

    # Print the row (Simulated)
    print(f"| {col1_info.ljust(47)} | {order_date_time.center(8)} | {col3_orders_day[0].ljust(36)} | {order_date_time.center(8)} | {col5_orders_cont[0].ljust(33)} |")
    
    # Print the remaining lines
    for i in range(1, max_height):
        c1 = col1_info.split('\n')[i] if i < col1_info.count('\n') + 1 else " "
        c3 = col3_orders_day[i] if i < len(col3_orders_day) else " "
        c5 = col5_orders_cont[i] if i < len(col5_orders_cont) else " "
        
        print(f"| {c1.ljust(47)} | {' '.center(8)} | {c3.ljust(36)} | {' '.center(8)} | {c5.ljust(33)} |")
    
    # End of first section
    print("+" + "-"*48 + "+" + "-"*10 + "+" + "-"*38 + "+" + "-"*10 + "+" + "-"*35 + "+")
    
    # --- Row 2: Post Admit Orders ---
    
    col3_post_admit = [
        "**หลังจากได้ rt-PA และ admit แล้ว**",
        "record V/S และ NS ตาม order continuation",
        " - if SBP >= 180 mmHg or DBP > 105 mmHg ให้ Notify แพทย์ให้ Nicardipine",
        "   20 mg + 5DW up to 100 ml iv drip 25 ml/hr titrate ทีละ 10 ml/hr",
        "   ทุก 5-15 min keep SBP <180 mmHg or DBP < 105 mmHg",
        "CT Brain NC หลังได้ rt-PA 24 hr",
        "if GCS drop, ปวดศรีษะมาก, อาเจียน, ชัก, เลือดออกตำแหน่งใดๆ ให้ Notify แพทย์ทันที",
        "Serial DTX q 6 hr keep 80 – 180 mg%",
        "Blood for FBS HbA1C Lipid profile พรุ่งนี้",
        "Consult PM&R พรุ่งนี้",
    ]
    
    max_height_post = len(col3_post_admit)
    
    # Print the row (Simulated)
    print(f"| {' '.ljust(47)} | {' '.center(8)} | {col3_post_admit[0].ljust(36)} | {' '.center(8)} | {' '.ljust(33)} |")
    
    # Print the remaining lines
    for i in range(1, max_height_post):
        c3 = col3_post_admit[i] if i < len(col3_post_admit) else " "
        print(f"| {' '.ljust(47)} | {' '.center(8)} | {c3.ljust(36)} | {' '.center(8)} | {' '.ljust(33)} |")
        
    print("+" + "-"*48 + "+" + "-"*10 + "+" + "-"*38 + "+" + "-"*10 + "+" + "-"*35 + "+")
    
    # --- Footer ---
    print("\n" + "ลงชื่อแพทย์(ER/MED) ........................................".ljust(40) + "ลงชื่อแพทย์(MED) .....................................".rjust(40))
    print("\n" + "="*80)
    print(" พื้นที่สำหรับติดสติกเกอร์ผู้ป่วย (Patient Sticker) ".center(80))
    print("="*80 + "\n")
    
    # คำสั่งให้ผู้ใช้กด Enter เพื่อให้โปรแกรมไม่ปิดไปทันที
    input("\n✅ สร้างใบสั่งยาเสร็จสิ้น! กรุณาตรวจสอบแล้วกด ENTER เพื่อออก...")

def main():
    """ฟังก์ชันหลักสำหรับรับค่าจากผู้ใช้"""
    
    os.system('cls' if os.name == 'nt' else 'clear') 
    
    print("=========================================================")
    print("  rt-PA Order Tool with Lab Name Retrieval")
    print("  Server: 192.168.41.110 (ต้องอยู่ในเครือข่ายภายใน)")
    print("=========================================================")
    
    # --- 1. รับ HN และดึงชื่อ ---
    while True:
        hn = input("กรุณาใส่ HN (พิมพ์ 'q' เพื่อออก): ").strip()
        if hn.lower() == 'q':
            sys.exit(0)
        if hn:
            patient_name = get_patient_name(hn)
            print(f"-> ชื่อคนไข้ที่ดึงได้: {patient_name}")
            if "ไม่พบชื่อ" in patient_name or "ไม่สามารถ" in patient_name:
                print("⚠️ กรุณาตรวจสอบ HN และ/หรือการเชื่อมต่อกับเซิร์ฟเวอร์ Lab")
                continue
            break
        print("กรุณาใส่ HN")

    # --- 2. รับน้ำหนัก ---
    while True:
        try:
            weight_str = input("กรุณาใส่น้ำหนัก (kg): ").strip()
            if weight_str.lower() == 'q':
                sys.exit(0)
            weight = float(weight_str)
            if weight > 0:
                break
            print("น้ำหนักต้องมากกว่า 0")
        except ValueError:
            print("กรุณาใส่ตัวเลขสำหรับน้ำหนักเท่านั้น")
            
    # --- 3. เลือกร Regimen ---
    regimen = 0.9 # ตั้งค่าเริ่มต้น
    while True:
        print("\nกรุณาเลือกขนาดยา (Dosage Regimen):")
        choice = input(" [1] Standard Dose 0.9 mg/kg (Max 90 mg)\n [2] Alternative Dose 0.6 mg/kg (Max 90 mg)\n ใส่ตัวเลข [1] หรือ [2]: ").strip()
        
        if choice == '1':
            regimen = 0.9
            break
        elif choice == '2':
            regimen = 0.6
            break
        elif choice.lower() == 'q':
            sys.exit(0)
        else:
            print("❌ เลือกไม่ถูกต้อง กรุณาใส่ [1] หรือ [2]")

    # --- 4. คำนวณและสร้างใบสั่งยา ---
    dose_data = calculate_rtpa_dose(weight, regimen)
    print_order_sheet(hn, weight, patient_name, dose_data)

if __name__ == "__main__":
    main()