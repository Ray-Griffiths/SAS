#print("QR code utility file")
import qrcode
import io

def generate_qr_code_data(data):
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()
