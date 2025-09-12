import qrcode
import io
import base64

def generate_qr_code_data(data):
    """
    Generates a QR code from the given data and returns it as a base64 encoded PNG string.
    """
    # The `qrcode.make` function can use different image factories.
    # The error `PyPNGImage.save()` indicates it's using the `pypng` backend.
    # The `save` method for this backend does not accept the `format` argument.
    img = qrcode.make(data)
    
    buf = io.BytesIO()
    
    # --- FIX: Removed the `format='PNG'` argument --- #
    img.save(buf)
    
    # The frontend expects a base64 string to display the image directly.
    # Prepending the data URL scheme is necessary for the browser to render it.
    base64_img = base64.b64encode(buf.getvalue()).decode('utf-8')
    return f"data:image/png;base64,{base64_img}"
