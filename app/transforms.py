import io
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

CONTENT_TYPE_FORMAT = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
}

FORMAT_CONTENT_TYPE = {
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
}

FORMAT_EXT = {"jpeg": "jpg", "png": "png", "webp": "webp", "gif": "gif"}

SEPIA_MATRIX = (
    0.393, 0.769, 0.189, 0,
    0.349, 0.686, 0.168, 0,
    0.272, 0.534, 0.131, 0,
)


def format_for_content_type(content_type):
    return CONTENT_TYPE_FORMAT.get(content_type, "jpeg")


def apply_transforms(image_bytes, params, output_format):
    img = Image.open(io.BytesIO(image_bytes))
    img.load()

    if params.resize:
        img = _resize(img, params.resize)
    if params.crop:
        c = params.crop
        img = img.crop((c.x, c.y, c.x + c.width, c.y + c.height))
    if params.rotate:
        img = img.rotate(-params.rotate, expand=True)
    if params.flip:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    if params.mirror:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    needs_rgb = params.brightness or params.contrast or params.saturation or params.invert or params.blur or params.sharpen
    if needs_rgb and img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    if params.brightness:
        img = ImageEnhance.Brightness(img).enhance(params.brightness / 100)
    if params.contrast:
        img = ImageEnhance.Contrast(img).enhance(params.contrast / 100)
    if params.saturation:
        img = ImageEnhance.Color(img).enhance(params.saturation / 100)
    if params.grayscale:
        img = img.convert("L").convert("RGB")
    if params.sepia:
        img = img.convert("RGB").convert("RGB", SEPIA_MATRIX)
    if params.invert:
        img = ImageOps.invert(img)
    if params.blur:
        img = img.filter(ImageFilter.GaussianBlur(radius=params.blur))
    if params.sharpen:
        img = img.filter(ImageFilter.SHARPEN)

    if output_format == "jpeg" and img.mode in ("RGBA", "P", "LA"):
        img = img.convert("RGB")

    buffer = io.BytesIO()
    save_kwargs = {}
    if params.compress_quality and output_format in ("jpeg", "webp"):
        save_kwargs["quality"] = params.compress_quality
    img.save(buffer, format=output_format.upper(), **save_kwargs)
    return buffer.getvalue(), FORMAT_CONTENT_TYPE.get(output_format, "image/jpeg")


def _resize(img, resize):
    width, height = resize.width, resize.height
    if width and height:
        return img.resize((width, height))
    if width:
        ratio = width / img.width
        return img.resize((width, max(1, round(img.height * ratio))))
    if height:
        ratio = height / img.height
        return img.resize((max(1, round(img.width * ratio)), height))
    return img
