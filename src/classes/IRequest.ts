import {Request} from 'express';
var User = require('../db/models/user');
export interface IRequest extends Request{
  user: any,
  files: any,
  current_action: any,
  current_group: any,
  action_type: any,
  publicGroups: any,
  group: any,
  current_user: any
  id: any;
}
