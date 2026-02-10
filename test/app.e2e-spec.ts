import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';

// 1. Define a tiny dummy controller right in the test
@Controller()
class DummyController {
  @Get()
  getHello() {
    return { status: 'ok' };
  }
}

describe('Dummy E2E (Isolation)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // 2. Compile a module with ONLY the dummy controller
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DummyController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('should respond to a basic GET request', () => {
    return request(app.getHttpServer() as Server)
      .get('/')
      .expect(200)
      .expect({ status: 'ok' });
  });

  afterAll(async () => {
    await app.close();
  });
});
