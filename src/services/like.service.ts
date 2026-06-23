import prisma from '../config/prisma';
export const likeService={
 async like(userId:string,wallpaperId:string){
  await prisma.wallpaperLike.upsert({where:{userId_wallpaperId:{userId,wallpaperId}},update:{},create:{userId,wallpaperId}});
  await prisma.wallpaper.update({where:{id:wallpaperId},data:{likes:{increment:1}}}).catch(()=>{});
  return {liked:true};
 },
 async unlike(userId:string,wallpaperId:string){
  await prisma.wallpaperLike.delete({where:{userId_wallpaperId:{userId,wallpaperId}}}).catch(()=>null);
  await prisma.wallpaper.update({where:{id:wallpaperId},data:{likes:{decrement:1}}}).catch(()=>{});
  return {liked:false};
 },
 async status(userId:string,wallpaperId:string){
  const row=await prisma.wallpaperLike.findUnique({where:{userId_wallpaperId:{userId,wallpaperId}}});
  return {liked:!!row};
 }
};
