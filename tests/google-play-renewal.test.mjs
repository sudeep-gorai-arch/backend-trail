import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getGooglePlayRenewalDetails } from '../src/utils/googlePlayRenewal.ts';
const obj=(state,autoRenewEnabled)=>({subscriptionState:state,lineItems:[{autoRenewingPlan:{autoRenewEnabled}}]});
test('active auto-renewing plan',()=>assert.deepEqual(getGooglePlayRenewalDetails(obj('SUBSCRIPTION_STATE_ACTIVE',true)),{state:'SUBSCRIPTION_STATE_ACTIVE',autoRenewing:true,cancellationScheduled:false}));
test('canceled but still entitled',()=>assert.equal(getGooglePlayRenewalDetails(obj('SUBSCRIPTION_STATE_CANCELED',false)).cancellationScheduled,true));
test('nonrenewing active Google state shows cancellation scheduled',()=>assert.equal(getGooglePlayRenewalDetails(obj('SUBSCRIPTION_STATE_ACTIVE',false)).cancellationScheduled,true));
test('expired auto-renew disabled is not newly marked cancellation scheduled',()=>assert.equal(getGooglePlayRenewalDetails(obj('SUBSCRIPTION_STATE_EXPIRED',false)).cancellationScheduled,false));
test('missing Google state remains unknown',()=>assert.equal(getGooglePlayRenewalDetails(null),null));
