import 'source-map-support/register'

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import * as uuid from 'uuid'
import * as AWS from 'aws-sdk'
import * as AWSXRay from 'aws-xray-sdk'

import { createLogger } from '../../utils/logger'

const XAWS = AWSXRay.captureAWS(AWS)

const bucketName = process.env.TODOITEM_S3_BUCKET_NAME
const urlExpiration = process.env.SIGNED_URL_EXPIRATION
const s3 = new XAWS.S3({
  signatureVersion: 'v4'
})

import * as middy from 'middy'
import { cors } from 'middy/middlewares'
import { TodoAccess } from '../../dataLayer/todoDB'

const todoAccess = new TodoAccess()
const logger = createLogger('generateUploadUrl')

export const handler = middy(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const todoId = event.pathParameters.todoId
    const attachmentId = uuid.v4()

    logger.info('Generating upload URL:', {
      todoId: todoId,
      attachmentId: attachmentId
    })

    const uploadUrl = s3.getSignedUrl('putObject', {
      Bucket: bucketName,
      Key: attachmentId,
      Expires: urlExpiration
    })

    await todoAccess.saveImgUrl(todoId, attachmentId, bucketName)

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        uploadUrl: uploadUrl
      })
    }
  }
)
handler.use(
  cors({
    credentials: true
  })
)
