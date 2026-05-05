import { BaseService, CoolCommException } from '@cool-midway/core';
import { Inject, Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import * as md5 from 'md5';
import { Equal, Repository } from 'typeorm';
import { v1 as uuid } from 'uuid';
import { PluginService } from '../../plugin/service/info';
import { UserInfoEntity } from '../entity/info';
import { UserSmsService } from './sms';
import { UserWxService } from './wx';

/**
 * 用户信息
 */
@Provide()
export class UserInfoService extends BaseService {
  @InjectEntityModel(UserInfoEntity)
  userInfoEntity: Repository<UserInfoEntity>;

  @Inject()
  pluginService: PluginService;

  @Inject()
  userSmsService: UserSmsService;

  @Inject()
  userWxService: UserWxService;

  /**
   * 绑定小程序手机号
   * @param userId
   * @param code
   * @param encryptedData
   * @param iv
   */
  async miniPhone(userId: number, code: any, encryptedData: any, iv: any) {
    const phone = await this.userWxService.miniPhone(code, encryptedData, iv);
    await this.userInfoEntity.update({ id: Equal(userId) }, { phone });
    return phone;
  }

  /**
   * 获取用户信息
   * @param id
   * @returns
   */
  async person(id) {
    const info = await this.userInfoEntity.findOneBy({ id: Equal(id) });
    delete info.password;
    return info;
  }

  /**
   * 注销
   * @param userId
   */
  async logoff(userId: number) {
    await this.userInfoEntity.update(
      { id: userId },
      {
        status: 2,
        phone: null,
        unionid: null,
        nickName: `已注销-00${userId}`,
        avatarUrl: null,
      }
    );
  }

  /**
   * 更新用户信息
   * @param id
   * @param param
   * @returns
   */
  async updatePerson(id, param) {
    const info = await this.person(id);
    if (!info) throw new CoolCommException('用户不存在');
    const next = {
      nickName: param.nickName,
      avatarUrl: param.avatarUrl,
      gender: param.gender,
      description: param.description,
    };
    Object.keys(next).forEach(key => {
      if (next[key] === undefined) {
        delete next[key];
      }
    });
    try {
      // 修改了头像要重新处理
      if (next.avatarUrl && info.avatarUrl != next.avatarUrl) {
        const file = await this.pluginService.getInstance('upload');
        next.avatarUrl = await file.downAndUpload(
          next.avatarUrl,
          uuid() + '.png'
        );
      }
    } catch (err) {}
    try {
      return await this.userInfoEntity.update({ id }, next);
    } catch (err) {
      throw new CoolCommException('更新失败，参数错误或者手机号已存在');
    }
  }

  /**
   * 更新密码
   * @param userId
   * @param password
   * @param 验证码
   */
  async updatePassword(userId, password, code) {
    const user = await this.userInfoEntity.findOneBy({ id: userId });
    const check = await this.userSmsService.checkCode(user.phone, code);
    if (!check) {
      throw new CoolCommException('验证码错误');
    }
    await this.userInfoEntity.update(user.id, { password: md5(password) });
  }

  /**
   * 通过旧密码更新密码，供桌面端账号中心使用
   * @param userId
   * @param oldPassword
   * @param newPassword
   */
  async updatePasswordByOld(userId, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
      throw new CoolCommException('请输入旧密码和新密码');
    }
    if (String(newPassword).length < 6) {
      throw new CoolCommException('新密码至少 6 位');
    }

    const user = await this.userInfoEntity.findOneBy({ id: userId });
    if (!user) {
      throw new CoolCommException('用户不存在');
    }
    if (!user.password || user.password !== md5(oldPassword)) {
      throw new CoolCommException('旧密码错误');
    }

    await this.userInfoEntity.update(user.id, { password: md5(newPassword) });
  }

  /**
   * 绑定手机号
   * @param userId
   * @param phone
   * @param code
   */
  async bindPhone(userId, phone, code) {
    const check = await this.userSmsService.checkCode(phone, code);
    if (!check) {
      throw new CoolCommException('验证码错误');
    }
    await this.userInfoEntity.update({ id: userId }, { phone });
  }
}
