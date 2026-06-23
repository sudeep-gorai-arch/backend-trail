import prisma from '../config/prisma';
export const subscriptionService={
 async verify(userId:string,data:any){
  const end=new Date(); end.setMonth(end.getMonth()+(data.plan==='annual'?12:1));
  const sub=await prisma.subscription.create({data:{userId,plan:data.plan,platform:data.platform,purchaseToken:data.purchaseToken,startDate:new Date(),endDate:end}});
  await prisma.user.update({where:{id:userId},data:{isPremium:true,premiumUntil:end}});
  return sub;
 },
 async status(userId:string){const u=await prisma.user.findUnique({where:{id:userId}});return {isPremium:u?.isPremium,premiumUntil:u?.premiumUntil};}
};
