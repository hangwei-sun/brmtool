import { CoolController, BaseController } from '@cool-midway/core';
import { UserInfoEntity } from '../../entity/info';
import { UserAdminInfoService } from '../../service/admin-info';

/**
 * 用户信息
 */
@CoolController({
  api: ['add', 'delete', 'update', 'info', 'list', 'page'],
  entity: UserInfoEntity,
  service: UserAdminInfoService,
  pageQueryOp: {
    fieldEq: ['a.status', 'a.gender', 'a.loginType'],
    keyWordLikeFields: ['a.nickName', 'a.phone'],
  },
})
export class AdminUserInfoController extends BaseController {}
