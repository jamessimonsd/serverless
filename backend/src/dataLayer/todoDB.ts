import * as AWS from 'aws-sdk'
import { createLogger } from '../utils/logger'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'

const logger = createLogger('todoAccess')

export class TodoAccess {
  constructor(
    private readonly docClient: DocumentClient = new AWS.DynamoDB.DocumentClient(),
    private readonly todosTable = process.env.TODOS_TABLE,
    private readonly userIndex = process.env.TODOS_USER_INDEX
  ) {}

  async getTodos(userId: string): Promise<TodoItem[]> {
    logger.info('Getting all todo items')
    try {
      console.log(this.docClient)
      return []
    } catch (error) {
      logger.error('FAILED TO GET ALL TODOS - DATA:', {
        userId,
        tableName: this.todosTable,
        indexName: this.userIndex
      })
    }
  }

  async getTodo(userId: string, todoId: string): Promise<TodoItem> {
    logger.info(`Getting todo item: ${todoId}`)
    const result = await this.docClient
      .query({
        TableName: this.todosTable,
        KeyConditionExpression: 'userId = :userId and todoId = :todoId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':todoId': todoId
        }
      })
      .promise()
    const todoItem = result.Items[0]
    return todoItem as TodoItem
  }

  async createTodo(newTodo: TodoItem): Promise<TodoItem> {
    logger.info(`Creating new todo item: ${newTodo.todoId}`)
    await this.docClient
      .put({
        TableName: this.todosTable,
        Item: newTodo
      })
      .promise()
    return newTodo
  }

  async updateTodo(
    userId: string,
    todoId: string,
    updateData: TodoUpdate
  ): Promise<void> {
    logger.info(`Updating a todo item: ${todoId}`)
    await this.docClient
      .update({
        TableName: this.todosTable,
        Key: { userId, todoId },
        ConditionExpression: 'attribute_exists(todoId)',
        UpdateExpression: 'set #n = :n, dueDate = :due, done = :dn',
        ExpressionAttributeNames: { '#n': 'name' },
        ExpressionAttributeValues: {
          ':n': updateData.name,
          ':due': updateData.dueDate,
          ':dn': updateData.done
        }
      })
      .promise()
  }

  async deleteTodo(userId: string, todoId: string): Promise<void> {
    await this.docClient
      .delete({
        TableName: this.todosTable,
        Key: { userId, todoId }
      })
      .promise()
  }

  async saveImgUrl(
    userId: string,
    todoId: string,
    bucketName: string
  ): Promise<void> {
    await this.docClient
      .update({
        TableName: this.todosTable,
        Key: { userId, todoId },
        ConditionExpression: 'attribute_exists(todoId)',
        UpdateExpression: 'set attachmentUrl = :attachmentUrl',
        ExpressionAttributeValues: {
          ':attachmentUrl': `https://${bucketName}.s3.amazonaws.com/${todoId}`
        }
      })
      .promise()
  }
}
