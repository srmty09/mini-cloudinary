import boto3
from botocore.exceptions import ClientError
from app.config import settings

_client = None


def _get_client():
    global _client
    if _client is None:
        if not settings.r2_endpoint:
            raise RuntimeError(
                "R2 is not configured yet — set R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET in .env"
            )
        _client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint,
            aws_access_key_id=settings.r2_access_key,
            aws_secret_access_key=settings.r2_secret_key,
        )
    return _client


def upload_file(key, data, content_type):
    _get_client().put_object(Bucket=settings.r2_bucket, Key=key, Body=data, ContentType=content_type)


def get_file(key):
    response = _get_client().get_object(Bucket=settings.r2_bucket, Key=key)
    return response["Body"].read()


def file_exists(key):
    try:
        _get_client().head_object(Bucket=settings.r2_bucket, Key=key)
        return True
    except ClientError:
        return False


def delete_file(key):
    _get_client().delete_object(Bucket=settings.r2_bucket, Key=key)
