import base64
import io
from typing import Tuple
from PIL import Image
from app.core.config import settings
from app.core.logging import logger


class ImageProcessingError(Exception):
    pass


class ImageService:
    @staticmethod
    def process_and_encode(
        file_bytes: bytes,
        max_dimension: int = 1024,
        quality: int = 85
    ) -> Tuple[str, str, Tuple[int, int]]:
        """
        Validates, optimizes, and encodes an image to a base64 string for Groq Vision models.
        Returns:
            (base64_data_uri, mime_type, (width, height))
        """
        if not file_bytes:
            raise ImageProcessingError("Empty image bytes received.")

        # Check raw file size limit
        file_size_mb = len(file_bytes) / (1024 * 1024)
        if file_size_mb > settings.MAX_IMAGE_SIZE_MB:
            raise ImageProcessingError(
                f"Image size ({file_size_mb:.1f} MB) exceeds maximum allowed ({settings.MAX_IMAGE_SIZE_MB} MB)."
            )

        try:
            image = Image.open(io.BytesIO(file_bytes))
            image.verify()  # Verify integrity
            # Reopen after verify because verify can leave stream at EOF
            image = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            logger.error(f"Image verification failed: {e}")
            raise ImageProcessingError(f"Invalid or corrupted image format: {str(e)}")

        # Convert to RGB if palette or RGBA
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")

        # Resize if dimensions exceed max_dimension
        orig_width, orig_height = image.size
        if orig_width > max_dimension or orig_height > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            logger.info(f"Resized image from ({orig_width}, {orig_height}) to {image.size}")

        final_width, final_height = image.size

        # Compress to JPEG buffer
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=quality, optimize=True)
        compressed_bytes = buffer.getvalue()

        # Encode to Base64
        encoded_b64 = base64.b64encode(compressed_bytes).decode("utf-8")
        data_uri = f"data:image/jpeg;base64,{encoded_b64}"

        return data_uri, "image/jpeg", (final_width, final_height)

    @staticmethod
    def extract_raw_base64(data_uri_or_b64: str) -> str:
        """Strips 'data:image/...;base64,' prefix if present."""
        if "," in data_uri_or_b64:
            return data_uri_or_b64.split(",", 1)[1]
        return data_uri_or_b64


image_service = ImageService()
