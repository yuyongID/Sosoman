/**
 * Mock 数据引用自 doc/interface.postman_collection.json 中的示例响应，
 * 仅在本地或 CI 自检场景使用，避免影响最终构建。
 */

import type {
  SosotestInterfaceData,
  SosotestInterfaceItem,
} from '@api/sosotest/interfaces';
import type {
  SosotestEnvironmentEntry,
  SosotestEnvironmentListResponseBody,
} from '@api/sosotest/environments';
import type { SosotestDebugBody } from '@shared/models/apiCollection';

interface MockInterfaceRecord extends SosotestInterfaceData, SosotestInterfaceItem {}

const interfaceList: MockInterfaceRecord[] = [
  {
    addName: '邓裕',
    modName: '邓裕',
    id: 185146,
    interfaceId: 'HTTP_INTERFACE_185146',
    addBy: 'dengyu032',
    title: '余额首页查询接口',
    casedesc: '余额首页查询接口',
    teamName: null,
    applyEnvIsolation: null,
    url: '/pc/wallet/dashboard',
    uri: 'nrs-pay-service',
    privacy_persons: '',
    state: 1,
    method: 'GET',
    useCustomUri: 0,
    customUri: '',
    allowRunProdEnv: 0,
    latestApprovalTime: '1970-10-10 00:00:00',
    latestApprovalId: 0,
    statusApprovalId: 0,
    approvalStatus: 1,
    teamKey: '',
    isAsync: 0,
    addTime: '2024-04-09 11:39:20',
    modTime: '2025-11-07 16:34:20',
    modBy: 'dengyu032',
    createSourceName: '平台',
    createSourceType: 'auto',
    header:
      '{"Accept":"*/*","Connection":"Keep-Alive","Ketracespidinstance-Role":"[\\"default\\"]","Ketracespidreq_id":"[\\"35a07442-fb58-41b8-b9a4-f942c8b75eb1\\"]","Sw3":"152754-10.228.136.189-7737-1710926849326-1430|3|100|100|#10.228.172.161","User-Agent":"Apache-HttpClient/4.5.10 (Java/1.8.0_232)","X-Ke-Business-Id":"14"}',
    params: 'commissionCode=DF23070600001937&source=2',
    bodyContent: '',
    bodyType: 'none',
    createSourceId: 1011,
    varsPre: '',
    varsPost: `#python
# 期待返回成功
imports('assert_resp_equal')
expected_result = {
  "code": 2000,
  "message": "操作成功",
  "data": {
    "availableAmount": 0,
    "availableAmountDesc": "截止当前可用于抵扣总额，扣除客户确认中金额后的总额",
    "frozenAmount": 121.02,
    "frozenAmountDesc": "截止当前抵扣确认中&退款中的总额",
    "refundedAmount": 432.02,
    "miniProgramType": 1,
    "walletPhone": "*******4925",
    "walletPhoneSec": "B002ȾⱯƇ4925",
    "projectOrderId": "531645525060452352"
  },
  "success": true
}
assert_resp_equal(expected_result, ignore_order=True, ignore_resp_item_added=True, ignore_numeric_type_changes=True)`,
    createSourceDesc: '大禹测试日志单接口',
    permissions: ['add', 'copy', 'edit', 'delete', 'check'],
    approvalStatusText: '未提审',
    businessLineId: 64,
    moduleId: 463,
    sourceId: 1,
    redirectUri: undefined,
    autoStrategyId: 0,
    caselevel: 5,
    status: 2,
    caseType: 2,
    urlRedirect: 0,
    business_line_id: 0,
    business_direction_id: 0,
    system_id: 0,
    sub_system_id: 0,
    timeout: 20,
    httpConfKey: 'integration',
  },
  {
    addName: '邓裕',
    modName: '邓裕',
    id: 193185,
    interfaceId: 'HTTP_INTERFACE_193185',
    addBy: 'dengyu032',
    title: '支行信息模糊查询',
    casedesc: 'https://weapons.ke.com/project/13863/interface/api/1686765',
    teamName: null,
    applyEnvIsolation: null,
    url: '/api/fund/subBank/fuzzyQuery',
    uri: 'nrs-pay-service',
    privacy_persons: '',
    state: 1,
    method: 'GET',
    useCustomUri: 0,
    customUri: '',
    allowRunProdEnv: 0,
    latestApprovalTime: '1970-10-10 00:00:00',
    latestApprovalId: 0,
    statusApprovalId: 0,
    approvalStatus: 1,
    teamKey: '',
    isAsync: 0,
    addTime: '2024-10-10 18:10:31',
    modTime: '2025-11-06 10:05:17',
    modBy: 'dengyu032',
    createSourceName: '平台',
    createSourceType: 'auto',
    header:
      '{"Accept":"application/json, text/plain, */*","Connection":"keep-alive","X-Ke-Business-Id":"14","User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36","Content-Type":"application/json"}',
    params: '',
    bodyContent: '',
    bodyType: 'none',
    createSourceId: 1011,
    varsPre: '',
    varsPost: '#python\nassert True',
    createSourceDesc: '接口平台',
    permissions: ['add', 'copy', 'edit', 'delete', 'check'],
    approvalStatusText: '未提审',
    businessLineId: 64,
    moduleId: 463,
    sourceId: 1,
    autoStrategyId: 0,
    caselevel: 5,
    status: 2,
    caseType: 2,
    urlRedirect: 0,
    business_line_id: 0,
    business_direction_id: 0,
    system_id: 0,
    sub_system_id: 0,
    timeout: 20,
    httpConfKey: 'integration',
  },
];

const environmentGroups: SosotestEnvironmentListResponseBody = {
  online_group: [
    {
      id: 12552,
      httpConfKey: 'lingshou-online',
      uriKey: 'nrs-pay-service',
      requestAddr: 'http://i.nrs-pay-service.home.ke.com',
      state: 1,
      env_key: 'lingshou-online',
      env_name: '零售线上环境',
      env_id: 3424,
      teamName: '新家居平台',
      addrEnvType: 1,
      groupType: 'online',
    } as SosotestEnvironmentEntry,
  ],
  test_group: [
    {
      id: 19749,
      httpConfKey: 'integration',
      uriKey: 'nrs-pay-service',
      requestAddr: 'http://nrs-pay-service.integration.ttb.test.ke.com',
      state: 1,
      env_key: 'integration',
      env_name: 'integration',
      env_id: 3653,
      teamName: '新家居平台',
      addrEnvType: 2,
      groupType: 'test',
    } as SosotestEnvironmentEntry,
    {
      id: 19593,
      httpConfKey: 'fanshuhui001',
      uriKey: 'nrs-pay-service',
      requestAddr: 'http://nrs-pay-service.fanshuhui001.ttb.test.ke.com',
      state: 1,
      env_key: 'fanshuhui001',
      env_name: 'fanshuhui001',
      env_id: 1825,
      teamName: '',
      addrEnvType: 2,
      groupType: 'test',
    } as SosotestEnvironmentEntry,
  ],
  local_group: [],
};

const debugBody: SosotestDebugBody = {
  respBodyText: JSON.stringify(
    {
      code: 2000,
      message: '操作成功',
      data: {
        availableAmount: 0,
        frozenAmount: 121.02,
        refundedAmount: 432.02,
        walletPhone: '*******4925',
        projectOrderId: '531645525060452352',
        accountList: [
          {
            availableAmount: 0,
            frozenAmount: 0,
            accountNo: 2004001670000635600,
            accountName: '北京贝壳家居科技有限公司',
          },
          {
            availableAmount: 0,
            frozenAmount: 0,
            accountNo: 2004001240000584000,
            accountName: '成都贝壳家居有限公司',
          },
        ],
      },
      success: true,
    },
    null,
    2
  ),
  varsPre: '<p>无准备数据</p>',
  varsPost:
    '<p>expected_result = {...}</p><p>json字符串对比结果：values_changed: {"root[\\\'data\\\'][\\\'walletPhoneSec\\\']": {"new_value": "19019394925", "old_value": "B002ȾⱯƇ4925"}}</p>',
  header:
    '{"Host":"nrs-pay-service.integration.ttb.test.ke.com","User-Agent":"Apache-HttpClient/4.5.10 (Java/1.8.0_232)","Accept":"*/*","Connection":"Keep-Alive"}',
  assertResult: '对比完成：walletPhoneSec 字段存在差异，其他字段一致',
  testResult: 'FAIL',
  beforeExecuteTakeTime: 13,
  executeTakeTime: 2522,
  afterExecuteTakeTime: 606,
  totalTakeTime: 3141,
};

export { interfaceList, environmentGroups, debugBody };
