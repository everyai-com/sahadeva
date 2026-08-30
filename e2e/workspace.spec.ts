import{expect,test}from"@playwright/test";

test.beforeEach(async({page})=>{await page.goto("/");await page.evaluate(()=>localStorage.clear());await page.reload();});

test("a first-time user can complete the three simple setup steps",async({page})=>{
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await page.getByLabel("Name").fill("Ananya");
  await page.getByRole("button",{name:"Next"}).click();
  await expect(page.getByText("Step 2 of 3")).toBeVisible();
  await page.getByLabel("Day").selectOption("8");
  await page.getByLabel("Month").selectOption("10");
  await page.getByLabel("Year").selectOption("1992");
  await page.getByLabel("Hour").selectOption("2");
  await page.getByLabel("Min").selectOption("47");
  await page.getByLabel("AM/PM").selectOption("PM");
  await page.getByRole("button",{name:"Next"}).click();
  await expect(page.getByText("Step 3 of 3")).toBeVisible();
  await page.getByLabel("Place of birth").fill("Chennai");
  await expect(page.getByText("1992-10-08 · 14:47")).toBeVisible();
  await expect(page.getByRole("button",{name:"Show my chart"})).toBeEnabled();
});

test("the beginner setup is keyboard reachable and never overflows the page",async({page})=>{
  let reachedName=false;for(let index=0;index<8;index++){await page.keyboard.press("Tab");reachedName=await page.getByLabel("Name").evaluate(element=>element===document.activeElement);if(reachedName)break}expect(reachedName).toBe(true);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("heading",{name:"Sahadeva"})).toBeVisible();
  await expect(page.getByText("No astrology knowledge needed.")).toBeVisible();
});

test("BTR opens a structured, editable three-event review",async({page})=>{
  await page.evaluate(()=>localStorage.setItem("sahadeva.profile.v1",JSON.stringify({name:"Ananya",date:"1992-10-08",time:"14:47",place:"Chennai",latitude:13.0827,longitude:80.2707,timezone:"Asia/Kolkata",timezoneOffset:5.5,language:"en",methodology:"parashari",focus:"career",birthTimeAccuracyMinutes:30,houseSystem:"whole-sign"})));
  await page.reload();
  await page.getByRole("button",{name:"BTR",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Birth-time rectification"})).toBeVisible();
  await expect(page.getByText("Event 1",{exact:true})).toBeVisible();
  await expect(page.getByText("Event 3",{exact:true})).toBeVisible();
  await expect(page.getByRole("button",{name:"Review complete · Run BTR"})).toBeDisabled();
  await page.getByRole("button",{name:"Add event"}).click();
  await expect(page.getByText("Event 4",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Restart"}).click();
  await expect(page.getByText("Event 3",{exact:true})).toBeVisible();
});
