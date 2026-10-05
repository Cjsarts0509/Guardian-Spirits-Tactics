globals
timer e=null
timerdialog x=null
unit array o
dialog V=null
button array E
integer array X
player array O
dialog R=null
button array I
string array A
texttag array N
string array b
force array B
dialog c=null
button array C
integer array d
integer array D
integer array f
dialog array G
button array h
string array H
integer array j
boolean J=false
boolean array k
boolean array K
string array l
string array L
string array m
string array M
location array P
integer q=0
integer Q=0
string s=""
timer S=null
timer T=null
string U="없음"
dialog array w
button array W
timer y=null
string Y=""
timer z=null
integer Z=0
boolean array vv
dialog ev=null
button array xv
player ov=null
integer rv=0
timer iv=null
dialog array av
button array nv
dialog Vv=null
button array Ev
boolean Xv=false
integer Ov=0
boolean array Rv
rect Iv=null
rect Av=null
rect Nv=null
rect bv=null
rect Bv=null
rect cv=null
rect Cv=null
rect dv=null
rect Dv=null
rect fv=null
rect Fv=null
rect gv=null
camerasetup Gv=null
sound hv=null
sound Hv=null
sound jv=null
sound Jv=null
sound kv=null
sound Kv=null
sound lv=null
sound Lv=null
sound mv=null
sound Mv=null
sound pv=null
sound Pv=null
sound qv=null
sound Qv=null
sound sv=null
sound Sv=null
sound tv=null
sound Tv=null
sound uv=null
sound Uv=null
sound wv=null
sound Wv=null
sound yv=null
sound Yv=null
sound zv=null
trigger Zv=null
trigger ve=null
trigger ee=null
trigger xe=null
trigger oe=null
trigger re=null
trigger ie=null
trigger ae=null
trigger ne=null
trigger Ve=null
trigger Ee=null
trigger Xe=null
trigger Oe=null
trigger Re=null
trigger Ie=null
trigger Ae=null
trigger Ne=null
trigger be=null
trigger Be=null
trigger ce=null
trigger Ce=null
trigger de=null
trigger De=null
trigger fe=null
trigger Fe=null
trigger ge=null
trigger Ge=null
trigger he=null
trigger He=null
trigger je=null
trigger Je=null
trigger ke=null
trigger Ke=null
trigger le=null
trigger Le=null
trigger me=null
trigger Me=null
trigger pe=null
trigger Pe=null
trigger qe=null
trigger Qe=null
trigger se=null
trigger Se=null
trigger te=null
trigger Te=null
trigger ue=null
trigger Ue=null
trigger We=null
trigger ye=null
trigger Ye=null
trigger ze=null
trigger Ze=null
trigger vx=null
trigger ex=null
trigger xx=null
trigger ox=null
trigger rx=null
trigger ix=null
trigger ax=null
trigger nx=null
trigger Vx=null
trigger Ex=null
trigger Xx=null
trigger Ox=null
trigger Rx=null
trigger Ix=null
trigger Ax=null
trigger Nx=null
trigger bx=null
trigger Bx=null
trigger cx=null
trigger Cx=null
trigger Dx=null
trigger fx=null
trigger Fx=null
trigger gx=null
trigger Gx=null
trigger hx=null
trigger Hx=null
trigger jx=null
trigger Jx=null
trigger kx=null
trigger Kx=null
trigger lx=null
trigger Lx=null
trigger mx=null
trigger Mx=null
trigger px=null
trigger Px=null
trigger qx=null
trigger Qx=null
trigger sx=null
trigger Sx=null
trigger tx=null
trigger Tx=null
trigger ux=null
trigger Ux=null
trigger wx=null
trigger Wx=null
trigger yx=null
trigger Yx=null
trigger zx=null
trigger Zx=null
trigger vo=null
trigger eo=null
trigger xo=null
trigger oo=null
trigger ro=null
trigger io=null
trigger ao=null
trigger no=null
trigger Vo=null
trigger Eo=null
trigger Xo=null
trigger Oo=null
trigger Ro=null
trigger Io=null
trigger Ao=null
trigger No=null
trigger bo=null
trigger Bo=null
trigger co=null
trigger Co=null
trigger do=null
trigger Do=null
trigger fo=null
trigger Fo=null
trigger go=null
trigger Go=null
trigger ho=null
trigger Ho=null
trigger jo=null
trigger Jo=null
trigger ko=null
trigger Ko=null
trigger lo=null
trigger Lo=null
trigger mo=null
trigger Mo=null
trigger po=null
trigger Po=null
trigger qo=null
trigger Qo=null
trigger so=null
trigger So=null
trigger to=null
trigger To=null
trigger uo=null
trigger Uo=null
trigger wo=null
trigger Wo=null
trigger yo=null
trigger Yo=null
timer zo=null
real vr=.0
real er=.0
group xr=null
force rr=null
boolexpr ir=null
endglobals

function nr takes real Vr returns nothing
    local real Er
    local real st=TimerGetElapsed(zo)
    if st<=0 then
        set zo=CreateTimer()
        call TimerStart(zo,$F4240,false,null)
    endif
    if(Vr>0) then
        loop
            set Er=Vr-TimerGetElapsed(zo)+st
            exitwhen Er<=0
            if(Er>bj_POLLED_WAIT_SKIP_THRESHOLD) then
                call TriggerSleepAction(.1*Er)
            else
                call TriggerSleepAction(bj_POLLED_WAIT_INTERVAL)
            endif
        endloop
    endif
endfunction

function Xr takes nothing returns boolean
    local real dx=GetDestructableX(GetFilterDestructable())-vr
    local real dy=GetDestructableY(GetFilterDestructable())-er
    return(dx*dx+dy*dy<=bj_enumDestructableRadius)
endfunction

function Rr takes player Ir,integer Ar returns group
    set xr=CreateGroup()
    set bj_groupEnumTypeId=Ar
    call GroupEnumUnitsOfPlayer(xr,Ir,filterGetUnitsOfPlayerAndTypeId)
    return xr
endfunction

function Nr takes player Ir returns force
    set rr=CreateForce()
    call ForceEnumAllies(rr,Ir,ir)
    return rr
endfunction

function br takes boolexpr Br returns force
    set rr=CreateForce()
    call ForceEnumPlayers(rr,Br)
    call DestroyBoolExpr(Br)
    return rr
endfunction

function cr takes itemtype Cr,integer dr returns nothing
    local group g
    set bj_stockPickedItemType=Cr
    set bj_stockPickedItemLevel=dr
    set g=CreateGroup()
    call GroupEnumUnitsOfType(g,"marketplace",ir)
    call ForGroup(g,function UpdateEachStockBuildingEnum)
    call DestroyGroup(g)
    set g=null
endfunction

function Dr takes nothing returns nothing
    local integer pickedItemId
    local itemtype fr
    local integer Fr=0
    local integer gr=0
    local integer dr
    set dr=1
    loop
        if(bj_stockAllowedPermanent[dr]) then
            set gr=gr+1
            if(GetRandomInt(1,gr)==1) then
                set fr=ITEM_TYPE_PERMANENT
                set Fr=dr
            endif
        endif
        if(bj_stockAllowedCharged[dr]) then
            set gr=gr+1
            if(GetRandomInt(1,gr)==1) then
                set fr=ITEM_TYPE_CHARGED
                set Fr=dr
            endif
        endif
        if(bj_stockAllowedArtifact[dr]) then
            set gr=gr+1
            if(GetRandomInt(1,gr)==1) then
                set fr=ITEM_TYPE_ARTIFACT
                set Fr=dr
            endif
        endif
        set dr=dr+1
        exitwhen dr>$A
    endloop
    if(gr==0) then
        set fr=null
return
    endif
    call cr(fr,Fr)
    set fr=null
endfunction

function Gr takes nothing returns nothing
    call Dr()
    call TimerStart(bj_stockUpdateTimer,bj_STOCK_RESTOCK_INTERVAL,true,function Dr)
endfunction

function Hr takes nothing returns boolean
    return true
endfunction

function Lr takes integer a returns nothing
    local integer mr=1
    if IsUnitAliveBJ(o[a]) then
        call DestroyTextTag(N[(a)])
        set s=(s+("///"+(H[(a)]+(" : "+GetHeroProperName(o[(a)])))))
        loop
            exitwhen mr>$C
            call SetPlayerAllianceStateBJ(Player(-1+((mr))),Player(-1+((a))),2)
            call SetPlayerAllianceStateBJ(Player(-1+((a))),Player(-1+((mr))),0)
            set mr=mr+1
        endloop
        call KillUnit(o[a])
        call KillUnit(FirstOfGroup(Rr(Player(-1+(a)),'u000')))
        call DisplayTimedTextToPlayer(Player(-1+((a))),.8,0,8,"당신은 사망했습니다.")
        call TriggerExecute(yo)
        call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,(a),("|c00ffffff"+(GetPlayerName(Player(-1+((a))))+"|r")))
        call SetPlayerFlagBJ(PLAYER_STATE_OBSERVER,true,Player(-1+(a)))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-사망한 |c00ff8080"+GetHeroProperName(o[a]))+"|r는(은) "+H[a]+"입니다!"))
    endif
endfunction

function Mr takes nothing returns boolean
    return(GetPlayerSlotState(GetFilterPlayer())==PLAYER_SLOT_STATE_PLAYING)and(GetPlayerController(GetFilterPlayer())==MAP_CONTROL_USER)
endfunction

function pr takes player i,player u returns boolean
    if IsPlayerInForce(i,B[1]) then
        if IsPlayerInForce(u,B[2]) then
            return true
        endif
    endif
    if IsPlayerInForce(u,B[1]) then
        if IsPlayerInForce(i,B[2]) then
            return true
        endif
    endif
    return false
endfunction

function Pr takes integer a returns nothing
    if GetUnitAbilityLevelSwapped('A03K',o[f[a]])>0 and GetUnitStateSwap(UNIT_STATE_MANA,o[f[a]])>=25. then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 |c00ff8080"+GetHeroProperName(o[f[(a)]])+"|r를 공격하였으나 살해하지 못했습니다.|c00ff8080(블러디 매드니스!)|r"))
        call SetUnitManaBJ(o[f[a]],(GetUnitStateSwap(UNIT_STATE_MANA,o[f[a]])-25.))
return
    endif
    if j[D[f[a]]]>0 then
        if GetUnitTypeId(o[(a)])=='H00B' then
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 |c00ff8080"+GetHeroProperName(o[f[(a)]])+"|r를 공격하였으나 살해하지 못했습니다.|c00ff8080(연쇄살인!)|r"))
            call UnitRemoveAbility(o[(a)],'A01D')
        else
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 |c00ff8080"+GetHeroProperName(o[f[(a)]])+"|r를 공격하였습니다."))
        endif
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[f[(a)]]))+"|r는 |c00ff8080"+I2S(j[D[f[a]]])+"|r회 더 공격받으면 사망합니다."))
        set j[D[f[(a)]]]=(j[D[f[(a)]]]-1)
        call SetUnitManaBJ(o[(a)],(GetUnitStateSwap(UNIT_STATE_MANA,o[(a)])+(I2R(GetUnitAbilityLevelSwapped('S006',o[(a)]))*30.)))
    else
        if GetUnitTypeId(o[(a)])=='H00B' then
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 |c00ff8080"+GetHeroProperName(o[f[(a)]])+"|r를 공격하여 살해했습니다.|c00ff8080(연쇄살인!)|r"))
        else
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 |c00ff8080"+GetHeroProperName(o[f[(a)]])+"|r를 공격하여 살해했습니다."))
        endif
        if GetUnitTypeId(o[(a)])=='H00K' then
            if GetUnitTypeId(o[f[(a)]])=='H00E' then
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080킬데르|r가 피닉스의 여왕이 가진 힘을 흡수하였습니다.")
                call UnitRemoveAbility(o[(a)],'A00Q')
                call UnitAddAbility(o[(a)],'A00N')
            endif
        endif
        call Lr(f[(a)])
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-살해당한 |c00ff8080"+GetHeroProperName(o[f[(a)]]))+"|r는(은) "+H[f[(a)]]+"입니다!"))
        call SetUnitManaBJ(o[(a)],(GetUnitStateSwap(UNIT_STATE_MANA,o[(a)])+(I2R(GetUnitAbilityLevelSwapped('S003',o[(a)]))*50.)))
        call SetUnitManaBJ(o[(a)],(GetUnitStateSwap(UNIT_STATE_MANA,o[(a)])+(I2R(GetUnitAbilityLevelSwapped('S004',o[(a)]))*50.)))
        call SetUnitManaBJ(o[(a)],(GetUnitStateSwap(UNIT_STATE_MANA,o[(a)])+(I2R(GetUnitAbilityLevelSwapped('S006',o[(a)]))*30.)))
    endif
endfunction

function qr takes integer a returns nothing
    if GetUnitTypeId(o[(a)])=='H00B' then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080소엔|r이  "+"연쇄살인에 실패하였습니다!"))
        call UnitRemoveAbility(o[(a)],'A01D')
return
    endif
    call DisplayTimedTextToPlayer(Player(-1+(f[(a)])),.8,0,8.,(("|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 당신을 공격하였으나 실패하였습니다."))
    if K[a]!=TRUE then
        if GetUnitAbilityLevelSwapped('A003',o[(a)])==1 then
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 누군가를 공격하였으나 실패하였습니다."))
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-공격에 한번 더 실패하면 사망합니다.")
            call IncUnitAbilityLevel(o[(a)],'A003')
        else
            if GetUnitAbilityLevelSwapped('A01Z',o[(a)])==1 then
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 누군가를 공격하였으나 실패하였습니다."))
            else
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 누군가를 공격하였으나 실패하여 살해당하였습니다."))
                call Lr(a)
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r은 "+H[a]+"입니다!"))
            endif
        endif
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(a)]))+"|r가 누군가를 공격하였으나 실패하였습니다."))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- 영혼의 회복으로 인해 공격 실패 페널티를 받지 않습니다.")
    endif
endfunction

function Qr takes nothing returns nothing
    call CreateQuestBJ(0,"제작진/사이트","|c00ff00ff- 제작|r : 포럼 커뮤니티\n|c00ff00ff- 사이트|r : http::4rum.co.kr\n\n|c00ff00ff- 기획/총괄|r : 카이(4rum_Kai)\n|c00ff00ff- 트리거|r : 리츠베른(4rum_Lizberne)\n\n공식 사이트의 맵 포럼 -> 가디언 스피리츠 택틱스 포럼에서 공식 맵의 다운과 룰 안내를 제공하고 있습니다.","ReplaceableTextures\\CommandButtons\\BTNExpandedView.tga")
    call CreateQuestBJ(0,"명령어","|c00ff00ff-번호 할말|r : 귓속말\n\n|c00ff00ff-'-공지 내용'|r : 다음 방제를 공지합니다. (호스트 전용)\n\n|c00ff00ff-!할말|r : 메모\n|c00ff00ff-! 할말|r : 메모 추가\n\n메모는 ! 외에 @ # $ 명령어로도 사용이 가능합니다.","ReplaceableTextures\\CommandButtons\\BTNReplay-Play.blp")
    call CreateQuestBJ(2,"게임 개요","이는 |c00ff00ff데스노트|r 및 |c00ff00ff타뷸라의 늑대|r 유즈맵을 모티브로 하며 Aos 맵 |c00ff00ff가디언 스피리츠 II|r를 배경으로 만들어진 맵입니다.\n\n두 개의 세력으로 나뉘어지며 참가자는 이 중 하나의 세력원이 되어 아군을 찾아내 협력하고 상대세력의 리더를 살해하는 것을 목적으로 합니다.","ReplaceableTextures\\CommandButtons\\BTNOrb.blp")
endfunction

function Sr takes nothing returns nothing
    call CreateQuestBJ(2,"제외 영웅","|c00ff00ff12 명|r : 제외 없음.\n|c00ff00ff11 명|r : 세피 제외.\n|c00ff00ff10 명|r : 세피/카스파 제외.\n|c00ff00ff9 명|r : 세피/카스파/레인딜라 제외.\n|c00ff00ff8 명|r : 세피/카스파/레인딜라/투마 제외.","ReplaceableTextures\\CommandButtons\\BTNReplay-Speeddown.blp")
    call CreateQuestBJ(0,"↓ 단테스 세력 ↓","|c00ff00ff- 단테스|r (석세스 오브 다크니스)\n|c00ff00ff- 메르츠키엘|r (세컨드 프린스)\n|c00ff00ff- 켈후|r (오우거 로드)\n|c00ff00ff- 프레이아|r (드로우 프리스티스)\n|c00ff00ff- 소엔|r (드로우 어쌔신)\n|c00ff00ff- 세피|r (카오스 위치)\n|c00ff0","ReplaceableTextures\\CommandButtons\\BTNNecropolis.blp")
    call CreateQuestBJ(0,"단테스","-공격\n-아군 확인\n-마황자의 명령 : 사용 횟수 1회. 목표 대상이 카이라면 살해한다. 만약 카이가 아니라면 단테스가 살해당하며 이는 게임의 패배로 연결될 수 있다.\n-후계자 임명 : 사용 횟수 1회. 목표 대상이 메르츠키엘이라면 후계자 권한을 부여한다.\n-전체 채팅 : '-전체 (내용)' 형태로 타이핑 할 시 자신의 정체를 숨기고 진명을 통하여 모든 참가자에게 말할 수 있다. 이 기능은 한번 사용할 때마다 마나를 35 소모한다.","ReplaceableTextures\\CommandButtons\\BTNMetamorphosis.blp")
    call CreateQuestBJ(0,"메르츠키엘","-상급 공격\n-배우자 : 목표 대상이 레인딜라일 경우 알아낸다.\n-쉐도우 자일 : 목표 대상을 45초 동안 무적상태 및 행동불능으로 만든다.\n@후계자 : 단테스의 후계자 임명 스킬로 획득. 단테스가 사망하더라도 메르츠키엘이 살아있으면 패배하지 않는다.","ReplaceableTextures\\CommandButtons\\BTNEvilIllidan.blp")
    call CreateQuestBJ(0,"켈후","-상급 공격\n-충복 : 목표 대상이 단테스일 경우 알아낸다.\n-하드 스킨 : 3번 공격당해야 사망한다.\n-보디가드 : 켈후가 살아있으면 단테스는 공격당하지 않는다.\n-전사의 후각 : 목표 대상이 상급 전사인지 여부를 알아낸다.\n@냉정함 : 소엔의 조언 스킬로 획득. 투마의 용맹한 돌진으로부터 보호받는다.","ReplaceableTextures\\CommandButtons\\BTNOgreLord.blp")
    call CreateQuestBJ(0,"프레이아","-스캔\n@신탁 : 게임 시작 3분 후 획득. 목표 대상의 진실의 보석 소유 여부를 간파해낸다. 소유하고 있을 경우 보석의 등급을 파악할 수 있다.","ReplaceableTextures\\CommandButtons\\BTNWarden2.blp")
    call CreateQuestBJ(0,"소엔","-적군 확인\n-백스텝 : 목표 대상이 소엔에게 동맹 상태일 경우 살해한다. 스킬 사용에 성공하면 연쇄살인 스킬을 획득한다.\n-변장 : 카이측의 이름으로 공표할 시 카이측의 '아군 확인' 및 '스캔' 스킬의 결과를 맞는 것으로 속일 수 있다.\n-조언 : 사용 횟수 1회. 목표 대상이 켈후라면 냉정함 스킬을 부여한다. 스킬 사용에 성공하면 소엔과 켈후는 서로 동맹 상태가 된다.\n@연쇄 살인 : 백스텝 스킬 성공 시 획득. 목표 대상의 정체를 기입하여 일치할 경우 살해한다. 기입한 정체가 틀리거나 보디가드가 있는 대상을 공격할 경우 실패하여 스킬이 사라진다.","ReplaceableTextures\\CommandButtons\\BTNHuntress.blp")
    call CreateQuestBJ(0,"레인딜라","-아군 확인\n-배우자 : 목표 대상이 메르츠키엘일 경우 알아낸다.\n-영혼의 회복 : 60초 동안 목표 대상은 공격에 실패하더라도 사망하지 않는다.\n-리비도의 여사제 : 사용 횟수 1회. 프레이아의 정체를 알아낸다. 이 스킬을 사용하려면 진명을 공표하고 있어야 한다.\n-영혼의 벽 : 사용 횟수 1회. 목표 대상은 소울 리버 스킬에 의해 살해당하지 않는다. 이 스킬을 사용하면 레인딜라는 소멸한다.","ReplaceableTextures\\CommandButtons\\BTNBanshee.blp")
    call CreateQuestBJ(0,"세피","-아군 확인\n-버닝 매직 : 목표 대상의 마나를 70 감소시킨다.\n-교란 : 목표 대상을 45초 동안 행동 불능으로 만든다. 크레이트의 나이트메어와 구분되지 않는다.\n-저주 : 목표 대상의 마나가 50 이하라면 그의 정체를 즉시 알아낸다. 이 스킬을 사용하려면 진명을 공표하고 있어야 한다.","ReplaceableTextures\\CommandButtons\\BTNBlueDemoness.blp")
    call CreateQuestBJ(2,"↓ 카이 세력 ↓","|c00ff00ff- 카이|r (프린스 오브 다크니스)\n|c00ff00ff- 아린|r (다크 템플러)\n|c00ff00ff- 크레이트|r (둠 로드)\n|c00ff00ff- 카스파|r (다크 샤먼)\n|c00ff00ff- 투마|r (플레임 블레이더)","ReplaceableTextures\\CommandButtons\\BTNSacrificialPit.blp")
    call CreateQuestBJ(2,"카이","-상급 공격\n-아군 확인\n-소울 리버 : 사용 횟수 1회. 목표 대상을 정체에 관계없이 살해한다. 20초 후 카이의 정체가 드러나며 이는 게임의 패배로 연결될 수 있다.\n-전체 채팅 : '-전체 (내용)' 형태로 타이핑 할 시 자신의 정체를 숨기고 진명을 통하여 모든 참가자에게 말할 수 있다. 이 기능은 한번 사용할 때마다 마나를 35 소모한다.","ReplaceableTextures\\CommandButtons\\BTNHeroDemonHunter.blp")
    call CreateQuestBJ(2,"아린","-공격\n-상급 적군 확인\n-충복 : 목표 대상이 카이일 경우 알아낸다.\n-룬 프로텍션 : 목표 대상을 45초 동안 무적 상태로 만든다.\n-보디가드 : 아린이 살아있으면 카이는 공격당하지 않는다.","ReplaceableTextures\\CommandButtons\\BTN_Hero_DarkTempler.blp")
    call CreateQuestBJ(2,"크레이트","-상급 스캔\n-나이트메어 : 목표 대상을 45초 동안 행동 불능으로 만든다. 세피의 교란과 구분되지 않는다.","ReplaceableTextures\\CommandButtons\\BTN_Hero_DoomLord.blp")
    call CreateQuestBJ(2,"카스파","-공격\n-아군 확인\n-충복 : 목표 대상이 카이일 경우 알아낸다.\n-정기 흡수 : 적을 공격하여 살해하면 마나를 50 회복한다.\n@그림자의 눈 : 게임 시작 5분 후 획득. 사용 횟수 1회. 진실의 조각이나 보석을 가진 상태에서 이 스킬을 사용하면 대상의 정체를 알 수 있다. 진실의 조각이나 보석은 등급에 관계없이 사라진다.","ReplaceableTextures\\CommandButtons\\BTN_Hero_DarkShaman.blp")
    call CreateQuestBJ(2,"투마","-상급 공격\n-용맹한 돌진 : 사용 횟수 1회. 목표 대상이 켈후라면 살해한다. 켈후가 냉정함 스킬을 가지고 있다면 실패한다. 스킬 사용에 성공하면 카이와 동맹이 된다.\n-화염의 근원 : 2번 공격당해야 사망한다.\n-전사의 후각 : 목표 대상이 상급 전사(상급공격 및 최상급공격을 보유)인지 여부를 알아낸다.","ReplaceableTextures\\CommandButtons\\BTNChaosWolfRider.blp")
endfunction

function Tr takes nothing returns nothing
    call CreateQuestBJ(2,"제외 영웅","|c00ff00ff12 명|r : 제외 없음.\n|c00ff00ff11 명|r : 컨슘 제외.\n|c00ff00ff10 명|r : 컨슘/쿠마린 제외.\n|c00ff00ff9 명|r : 컨슘/쿠마린/사신트 제외.\n|c00ff00ff8 명|r : 컨슘/쿠마린/사신트/타친 제외.","ReplaceableTextures\\CommandButtons\\BTNReplay-Speeddown.blp")
    call CreateQuestBJ(2,"↓ 지상 연합 ↓","|c00ff00ff- 라엘|r (엘프 히어로)\n|c00ff00ff- 케인|r (문 울프)\n|c00ff00ff- 에오릴|r (피닉스 퀸)\n|c00ff00ff- 뉴켈리어스|r (엘더 드루이드)\n|c00ff00ff- 쿠마린|r (타우렌 치프틴)\n|c00ff00ff- 타친|r (트롤 치프틴)","ReplaceableTextures\\CommandButtons\\BTNHumanCaptureFlag.blp")
    call CreateQuestBJ(2,"라엘","-공격\n-아군 확인\n-리더쉽 : 사용 횟수 1회. 원하는 아군 한명의 정체를 알아낼 수 있다. 이 스킬을 사용하려면 진명을 공표하고 있어야 한다. 게임시간으로 6분이 되면 상급 리더쉽으로 변경된다.\n@상급 리더쉽 : 게임 시간 6분 후 획득. 사용 횟수 1회. 원하는 아군 한명의 정체를 알아낼 수 있다.\n@에오릴의 시험 : 에오릴의 시련 스킬로 획득. 사용 횟수 1회. 목표 대상이 에오릴이라면 마스터의 권능 스킬을 획득한다.\n@마스터의 권능 : 에오릴의 시험 스킬 성공 시 획득. 사용 횟수 1회. 목표 대상을 정체에 관계없이 살해한다.","ReplaceableTextures\\CommandButtons\\BTNPriest.blp")
    call CreateQuestBJ(2,"케인","-공격\n-상급 적군 확인\n-울프스 슬러쉬 : 사용 횟수 1회. 목표 대상을 즉시 1회 공격한다. 사용하면 케인의 정체가 드러난다.\n-문 프로텍션 : 2번 공격당해야 사망한다.","ReplaceableTextures\\CommandButtons\\BTN_Hero_MoonWolf.blp")
    call CreateQuestBJ(2,"에오릴","-아군 확인\n-플레임 쉐클 : 목표 대상을 45초 동안 행동 불능 상태로 만든다.\n-시련 : 사용 횟수 1회. 목표 대상이 라엘이라면 시련을 부여한다. 라엘은 1분 뒤 에오릴의 시험 스킬을 획득한다. 라엘이 이 스킬을 당신에게 사용한다면 그는 마스터의 권능 스킬을 획득한다.\n-피닉스의 불꽃 : 사용 횟수 1회. 목표 대상이 컨슘이라면 살해한다. 그러나 컨슘이 레지스턴스 스킬을 가지고 있다면 실패한다.\n-여왕의 눈 : 킬데르의 카사노바 스킬 사용을 간파한다. 당신이 킬데르의 이름을 공표하면 카사노바의 대상이 되지 않는다. 만약 당신이 진명을 공표하면 킬데르가 카사노바를 사용했을 때 그의 정체를 알아낼 수 있다.","ReplaceableTextures\\CommandButtons\\BTNSorceress.blp")
    call CreateQuestBJ(2,"뉴켈리어스","-스캔\n-차크라 매직 : 사용 횟수 1회. 목표 대상의 마나를 100 회복시킨다. 1분 뒤 뉴켈리어스의 정체가 드러난다.\n-전체 채팅 : '-전체 (내용)' 형태로 타이핑 할 시 자신의 정체를 숨기고 진명도 숨긴 채 모든 참가자에게 말할 수 있다. 이 기능은 한번 사용할 때마다 마나를 25 소모한다.","ReplaceableTextures\\CommandButtons\\BTNFurion.blp")
    call CreateQuestBJ(2,"타친","-상급 공격\n-연합 결성 : 목표 대상이 쿠마린일 경우 알아낸다.\n-중화의 주술 : 목표 대상에게 걸려있는 마법을 제거한다. 대표적으로 시잉 오브 리비도 및 블랙 스펠을 방해할 수 있다.\n-트롤 리제너레이션 : 2번 공격당해야 사망한다.","ReplaceableTextures\\CommandButtons\\BTNForestTrollTrapper.blp")
    call CreateQuestBJ(2,"쿠마린","-공격\n-아군 확인\n-연합 결성 : 목표 대상이 타친일 경우 알아낸다.\n-포박의 주술 : 목표 대상이 컨슘이라면 그가 소유한 레지스턴스 스킬을 제거한다. 컨슘이 레지스턴스 스킬을 가지고 있지 않다면 실패한다.\n-지휘관 보호 : 사용 횟수 1회. 목표 대상이 라엘이라면 그의 보디가드가 된다. 보디가드가 되면 당신이 살아있는 동안 라엘은 공격에 대해 2번 보호 받는다.","ReplaceableTextures\\CommandButtons\\BTNHeroTaurenChieftain.blp")
    call CreateQuestBJ(0,"↓ 다크니스 ↓","|c00ff00ff- 엘타스|r (블랙 나이트)\n|c00ff00ff- 사신트|r (오버로드)\n|c00ff00ff- 킬데르|r (로열 뱀파이어)\n|c00ff00ff- 허밀리|r (다크 프리스트)\n|c00ff00ff- 드라칸|r (블랙타워 메지션)\n|c00ff00ff- 컨슘|r (미트 골렘)","ReplaceableTextures\\CommandButtons\\BTNOrcCaptureFlag.blp")
    call CreateQuestBJ(0,"엘타스","-최상급 공격\n-아군 확인\n-리더쉽 : 사용 횟수 1회. 원하는 아군 한명의 정체를 알아낼 수 있다. 이 스킬을 사용하려면 진명을 공표하고 있어야 한다. 게임시간으로 6분이 되면 상급 리더쉽으로 변경된다.\n-블러디 하트 : 공격에 성공하면 마나를 30 획득한다.\n-엘타스의 방패 : 3번 공격당해야 사망한다.\n@상급 리더쉽 : 게임 시간 6분 후 획득. 사용 횟수 1회. 원하는 아군 한명의 정체를 알아낼 수 있다.","ReplaceableTextures\\CommandButtons\\BTNHeroDeathKnight.blp")
    call CreateQuestBJ(0,"사신트","-공격\n-상급 아군 확인\n-지원 : 목표 대상의 마나를 30 증가시킨다. 스스로에게는 사용할 수 없다.\n-트레이닝 : 사용 횟수 1회. 목표 대상이 컨슘이라면 상급 공격 스킬을 부여한다.\n-배틀 마스터리 : 사용 횟수 1회. 지원 스킬을 잃고, 상급 공격 스킬을 획득한다.\n@상급 공격 : 배틀 마스터리 스킬 사용 시 획득.","ReplaceableTextures\\CommandButtons\\BTNChaosWarlord.blp")
    call CreateQuestBJ(0,"킬데르","-공격\n-아군 확인\n-뱀파이어릭 : 적을 공격하여 살해하면 마나를 50 회복한다. 에오릴을 살해하면 마스터의 권능 스킬을 획득한다.\n@카사노바 : 목표 대상이 에오릴이라면 6초 후 알아낸다. 킬데르의 이름으로 공표한 대상에겐 사용할 수 없다. 에오릴은 당신이 이 스킬을 누구에게 사용하였는지 간파할 수 있으며, 만약 에오릴이 진명을 공표했다면 이 스킬을 사용했을 때 당신의 정체를 알아낼 수 있다.\n@마스터의 권능 : 에오릴을 살해했을 경우 획득. 사용 횟수 1회. 목표 대상을 정체에 관계없이 살해한다.","ReplaceableTextures\\CommandButtons\\BTNHeroDreadLord.blp")
    call CreateQuestBJ(0,"허밀리","-스캔\n-시잉 오브 리비도 : 사용 횟수 1회. 목표 대상에게 시잉 오브 리비도 버프를 부여한다. 대상은 35초 동안 무적 상태가 된다. 30초 후 그 대상에게 시잉 오브 리비도 버프가 남아있다면 목표 대상의 정체를 알아낼 수 있다.\n-리비도의 보호 : 사용 횟수 1회. 목표 대상이 컨슘이라면 레지스턴스 스킬을 부여한다.","ReplaceableTextures\\CommandButtons\\BTNNecromancer.blp")
    call CreateQuestBJ(0,"드라칸","-적군 확인\n-블랙 스펠 : 사용 횟수 1회. 목표 대상은 마나를 50 잃고 100초 동안 행동 불능 상태가 된다.\n-인챈트먼트 머슬 : 사용 횟수 1회. 목표 대상이 컨슘이라면 아이언 스킨 스킬을 부여한다.\n-전체 채팅 : '-전체 (내용)' 형태로 타이핑 할 시 자신의 정체를 숨기고 진명도 숨긴 채 모든 참가자에게 말할 수 있다. 이 기능은 한번 사용할 때마다 마나를 25 소모한다.","ReplaceableTextures\\CommandButtons\\BTNSkeletonMage.blp")
    call CreateQuestBJ(0,"컨슘","-공격\n-노예 본능 : 목표 대상이 엘타스일 경우 알아낸다.\n-주인 보호 : 사용 횟수 1회. 목표 대상이 엘타스라면 그의 보디가드가 된다. 보디가드가 되면 당신이 살아있는 동안 라엘은 공격에 대해 2번 보호 받는다.\n-최종 진화 : 사용 횟수 1회. 레지스턴스, 아이언 스킨, 상급 공격 스킬을 모두 가지고 있다면 진화한다. 학살 스킬을 획득한다.\n@상급 공격 : 사신트의 트레이닝 스킬로 획득.\n@아이언 스킨 : 드라칸의 인챈트먼트 머슬 스킬로 획득. 3번 공격당해야 사망한다.\n@레지스턴스 : 허밀리의 리비도의 보호 스킬로 획득. 피닉스의 불꽃에 의해 사망하지 않는다.\n@학살 : 목표 대상을 정체에 관계없이 살해한다.","ReplaceableTextures\\CommandButtons\\BTNAbomination.blp")
endfunction

function Ur takes nothing returns nothing
    call CreateQuestBJ(2,"제외 영웅","|c00ff00ff12 명|r : 제외 없음.\n|c00ff00ff11 명|r : 세피 제외.\n|c00ff00ff10 명|r : 세피/카미카제 제외.\n|c00ff00ff9 명|r : 세피/카미카제/투마 제외.\n|c00ff00ff8 명|r : 세피/카미카제/투마/로네리스 제외.","ReplaceableTextures\\CommandButtons\\BTNReplay-Speeddown.blp")
    call CreateQuestBJ(2,"↓ 다크니스 세력 ↓","|c00ff00ff- 카이|r (프린스 오브 다크니스)\n|c00ff00ff- 아린|r (다크 템플러)\n|c00ff00ff- 카스파|r (다크 샤먼)\n|c00ff00ff- 프레이아|r (드로우 프리스티스)\n|c00ff00ff- 투마|r (플레임 블레이더)\n|c00ff00ff- 세피|r (카오스 위치)","ReplaceableTextures\\CommandButtons\\BTNOrcCaptureFlag.blp")
    call CreateQuestBJ(2,"카이","-상급 공격\n-아군 확인\n-소울 리버 : 사용 횟수 1회. 목표 대상을 정체에 관계없이 살해한다. 20초 후 카이의 정체가 드러나며 이는 게임의 패배로 연결될 수 있다.\n-전체 채팅 : '-전체 (내용)' 형태로 타이핑 할 시 자신의 정체를 숨기고 진명을 통하여 모든 참가자에게 말할 수 있다. 이 기능은 한번 사용할 때마다 마나를 35 소모한다.","ReplaceableTextures\\CommandButtons\\BTNHeroDemonHunter.blp")
    call CreateQuestBJ(2,"아린","-공격\n-적군 확인\n-충복 : 목표 대상이 카이일 경우 알아낸다.\n-룬 프로텍션 : 목표 대상을 45초 동안 무적 상태로 만든다.\n-보디가드 : 아린이 살아있으면 카이는 공격당하지 않는다.","ReplaceableTextures\\CommandButtons\\BTN_Hero_DarkTempler.blp")
    call CreateQuestBJ(2,"카스파","-공격\n-아군 확인\n-충복 : 목표 대상이 카이일 경우 알아낸다.\n-정기 흡수 : 적을 공격하여 살해하면 마나를 50 회복한다.\n-종교 동맹 : 사용 횟수 1회. 진명을 내어야 사용할 수 있다. 1분 뒤 프레이아의 정체를 알아내지만 종교동맹 사실이 모든 플레이어에게 알려진다.\n@신탁 : 게임 시작 5분 후 획득. 사용 횟수 1회. 목표 대상의 진실의 보석 소유 여부를 간파해낸다. 소유하고 있을 경우 보석의 등급을 파악할 수 있다.","ReplaceableTextures\\CommandButtons\\BTN_Hero_DarkShaman.blp")
    call CreateQuestBJ(2,"투마","-상급 공격\n-용맹한 돌진 : 사용 횟수 1회. 목표 대상이 카미카제라면 살해한다. 스킬 사용에 성공하면 최상급 공격을 획득하고 카이와 서로 동맹이 된다.\n-화염의 근원 : 2번 공격당해야 사망한다.\n-돌격 감각 : 목표 대상이 카미카제인지 여부를 알아낸다. 카미카제나 투마의 이름을 공표한 대상에겐 이 스킬을 사용할 수 없다.\n@최상급 공격 : 용맹한 돌진 스킬 성공 시 획득.","ReplaceableTextures\\CommandButtons\\BTNChaosWolfRider.blp")
    call CreateQuestBJ(2,"프레이아","-상급 스캔\n-종교 동맹 : 사용 횟수 1회. 진명을 내어야 사용할 수 있다. 1분 뒤 카스파의 정체를 알아내지만 종교동맹 사실이 모든 플레이어에게 알려진다.\n-미명의 안개 : 대상을 향한 적군 확인/배틀 센스 스킬의 효과를 1번 무효화하고 자신은 대상을 확인한 영웅이 누구인지와 스킬의 종류를 알 수 있다.","ReplaceableTextures\\CommandButtons\\BTNWarden2.blp")
    call CreateQuestBJ(2,"세피","-아군 확인\n-버닝 매직 : 목표 대상의 마나를 50 감소시킨다.\n-교란 : 목표 대상을 45초 동안 행동 불능으로 만든다.\n-저주 : 목표 대상의 마나가 50 이하라면 그의 정체를 즉시 알아낸다. \n-왜곡 : 사용 횟수 1회. 목표 대상이 소유한 진실의 보석 등급을 한단계 낮춘다.","ReplaceableTextures\\CommandButtons\\BTNBlueDemoness.blp")
    call CreateQuestBJ(0,"↓ 가디언 세력 ↓","|c00ff00ff- 샤이닝|r (그랜드 제너럴)\n|c00ff00ff- 치즈코|r (하프 엔젤릭)\n|c00ff00ff- 유이|r (디바인 나이트)\n|c00ff00ff- 로네리스|r (크루스닉)\n|c00ff00ff- 수프라|r (블러디 나이트)\n|c00ff00ff- 카미카제|r (그레이트 워리어)","ReplaceableTextures\\CommandButtons\\BTNHumanCaptureFlag.blp")
    call CreateQuestBJ(0,"샤이닝","-아군 스캔\n-전체 채팅 : '-전체 (내용)' 형태로 타이핑 할 시 자신의 정체를 숨기고 진명을 통하여 모든 참가자에게 말할 수 있다. 이 기능은 한번 사용할 때마다 마나를 35 소모한다.\n-위대한 의지 : 사용 횟수 1회. 목표 대상이 카이라면 살해한다. 만약 카이가 아니라면 샤이닝은 20초 후 자신의 정체가 드러난다.\n-혈족 : 목표 대상이 치즈코일 경우 알아낸다.\n-합류 : 사용 횟수 1회. 목표 대상이 유이라면 전략 포인트를 1 증가시킨다. 합류에 실패할 경우 자신의 정체가 드러난다.","ReplaceableTextures\\CommandButtons\\BTNDragonHawk.blp")
    call CreateQuestBJ(0,"치즈코","-적군 스캔\n-혈족 : 목표 대상이 샤이닝일 경우 알아낸다.\n-천사의 세례 : 목표 대상이 기사이며(유이, 수프라, 로네리스) 누구인지 맞춘다면 그에게 특수한 스킬을 부여한다. 스킬 사용에 실패하면 이 스킬을 상실한다.\n-외교 : 사용 횟수 1회. 목표 대상에게 즉시 자신의 정체를 드러낸다. 15초 후 목표 대상의 정체를 간파한다.\n-합류 : 사용 횟수 1회. 목표 대상이 유이라면 전략 포인트를 1 증가시킨다. 합류에 실패할 경우 자신의 정체가 드러난다.","ReplaceableTextures\\CommandButtons\\BTNJaina.blp")
    call CreateQuestBJ(0,"수프라","-상급 공격\n-기사도 : 자신이 진명을 내었다면 목표 대상이 기사(유이, 로네리스, 수프라)일 경우 알아낸다. 진명을 내지 않았다면 목표 대상이 진명을 낸 기사일 경우에 알아낸다. 스킬에 성공하면 디펜드 스킬의 등급이 1 증가한다.\n-디펜드 : 기사도에 성공할 경우 1회, 치즈코의 천사의 세례를 받은 경우 2회 더 공격받아야 사망한다.\n-합류 : 사용 횟수 1회. 목표 대상이 유이라면 전략 포인트를 1 증가시킨다. 합류에 실패할 경우 자신의 정체가 드러난다.","ReplaceableTextures\\CommandButtons\\BTNTheCaptain.blp")
    call CreateQuestBJ(0,"로네리스","-공격\n-기사도 : 자신이 진명을 내었다면 목표 대상이 기사(유이, 로네리스, 수프라)일 경우 알아낸다. 진명을 내지 않았다면 목표 대상이 진명을 낸 기사일 경우에 알아낸다. 스킬에 성공하면 적군 확인 스킬을 획득한다.\n-기사단 창설 : 사용 횟수 1회. 목표 대상이 수프라라면 성공한다. 유이에 대한 합류에 성공하고 수프라에 대한 기사단 창설에 성공한다면 기사단의 심문 스킬을 획득한다.\n-합류 : 사용 횟수 1회. 목표 대상이 유이라면 전략 포인트를 1 증가시킨다. 합류에 실패할 경우 자신의 정체가 드러난다.\n@기사단의 심문 : 사용 횟수 1회. 합류와 기사단 창설 스킬 성공 시 획득. 1분 뒤에 목표 대상의 정체를 알아낸다.\n@이단 심판 : 치즈코의 천사의 세례 스킬로 획득. 목표 대상이 카스파 혹은 프레이아라면 살해한다.","ReplaceableTextures\\CommandButtons\\BTNHeroPaladin.blp")
    call CreateQuestBJ(0,"유이","-공격\n-기사도 : 자신이 진명을 내었다면 목표 대상이 기사(유이, 로네리스, 수프라)일 경우 알아낸다. 진명을 내지 않았다면 목표 대상이 진명을 낸 기사일 경우에 알아낸다. 스킬에 성공하면 스캔 스킬을 획득한다.\n@스캔 : 기사도나 치즈코의 천사의 세례 스킬로 획득.\n@상급 스캔 : 기사도와 치즈코의 천사의 세례 스킬을 전부 받으면 획득.\n@매스 텔레포트 : 사용 횟수 1회. 자신의 정체를 드러내고 목표 대상을 즉시 살해한다.\n@상급 매스 텔레포트 : 사용 횟수 1회. 목표 대상을 즉시 살해한다.","ReplaceableTextures\\CommandButtons\\BTNSpellBreaker.blp")
    call CreateQuestBJ(0,"카미카제","-공격\n-배틀 센스\n-사령관 탐색 : 목표 대상이 샤이닝일 경우 알아낸다. 탐색에 성공했을 경우 상급 아군 확인 스킬을 획득한다.\n-고대의 주술 : 소유한 보석의 등급을 한 단계 상승시킨다. 보석이 없을 경우 혹은 이미 완성된 보석이 있을 경우엔 스킬을 사용할 수 없다.\n-하드 스킨 : 3번 공격당해야 사망한다.\n-합류 : 사용 횟수 1회. 목표 대상이 유이라면 전략 포인트를 1 증가시킨다. 합류에 실패할 경우 자신의 정체가 드러난다.\n@상급 아군 확인 : 사령관 탐색 스킬 성공 시 획득.","ReplaceableTextures\\CommandButtons\\BTNHeroTaurenChieftain.blp")
endfunction

function Wr takes nothing returns nothing
    call CreateQuestBJ(2,"제외 영웅","|c00ff00ff12 명|r : 제외 없음.\n|c00ff00ff11 명|r : 하치 제외.\n|c00ff00ff10 명|r : 하치/세이로우 제외.\n|c00ff00ff9 명|r : 울피안/울디안/세이로우 제외.\n|c00ff00ff8 명|r : 울피안/울디안/하치/세이로우 제외.","ReplaceableTextures\\CommandButtons\\BTNReplay-Speeddown.blp")
    call CreateQuestBJ(0,"↓ 얼음 부족 ↓","|c00ff00ff- 치스|r (트롤 치프틴)\n|c00ff00ff- 사토시|r (아이스 가드)\n|c00ff00ff- 즈윈라|r (아이스 워로드)\n|c00ff00ff- 하치|r (엘더 헤드헌터)\n|c00ff00ff- 토크라|r (아이스 샤먼)\n|c00ff00ff- 울디안|r (와일드 휴먼)\n|c00ff00ff- 울피안|r (와일드 휴먼)","ReplaceableTextures\\CommandButtons\\BTNGlacier.blp")
    call CreateQuestBJ(0,"치스","-아군 스캔\n-홀리 바인딩 : 사용 횟수 1회. 목표 대상이 데카일 경우 블러디 매드니스를 제거하며, 그 정체가 모든 사람에게 드러난다.\n-전체 채팅 : '-전체 (내용)' 형태로 타이핑 할 시 자신의 정체를 숨기고 진명도 숨긴 채 모든 참가자에게 말할 수 있다. 이 기능은 한번 사용할 때마다 마나를 25 소모한다.\n@정령의 주술 : 게임 시작 3분 후 획득. 진명을 공표하고 있어야 사용할 수 있다. 목표 대상이 적이고, 진실의 보석이나 조각을 가지고 있지 않다면 즉시 정체를 알아낸다.","ReplaceableTextures\\CommandButtons\\BTNWitchDoctor.blp")
    call CreateQuestBJ(0,"사토시","-상급 공격\n-보디가드 : 사토시와 즈윈라가 살아있으면 치스는 공격당하지 않는다.\n-형제 : 목표 대상이 즈윈라일 경우 알아내며 서로 동맹이 된다.\n-트롤 리제너레이션 : 2번 공격당해야 사망한다.\n-족장 보호 : 1회용. 치스에게 사용하면 사토시가 사망할 때까지 치스를 무모한 돌진으로부터 보호한다.\n@아군 확인 : 형제 스킬 성공 시 획득.","ReplaceableTextures\\CommandButtons\\BTNForestTroll.blp")
    call CreateQuestBJ(0,"즈윈라","-상급 공격\n-보디가드 : 사토시와 즈윈라가 살아있으면 치스는 공격당하지 않는다.\n-형제 : 목표 대상이 사토시일 경우 알아내며 서로 동맹이 된다.\n-트롤 리제너레이션 : 2번 공격당해야 사망한다.\n@아군 확인 : 형제 스킬 성공 시 획득.\n@족장 탐색 : 게임 시작 3분 후 획득. 진명을 공표해야 사용 가능. 60초 후 치스의 정체를 알아낸다.","ReplaceableTextures\\CommandButtons\\BTNIceTrollBeserker.blp")
    call CreateQuestBJ(0,"하치","-트롤 부족의 맹독 : 목표 대상의 마나를 30 감소시킨다.\n-고대의 주술 : 소유한 보석의 등급을 한단계 상승시킨다. 보석이 없을 경우 혹은 이미 완성된 보석이 있을 경우엔 스킬을 사용할 수 없다.\n-하이드 : 아군/적군 확인과 스캔으로는 하치를 확인할 수 없다.\n-사냥꾼의 표식 : 진명을 공표한 상태로 사용 가능. 대상 적에게 사냥꾼의 표식을 새긴다. 대상 적의 정체를 선택하여 성공할 경우 모든 플레이어에게 그 정체를 알린다. 스킬에 실패할 경우 하치의 정체가 드러난다.","ReplaceableTextures\\CommandButtons\\BTNHeadhunter.blp")
    call CreateQuestBJ(0,"토크라","-스캔\n-지원 : 목표 대상의 마나를 30 증가시킨다. 스스로에게는 사용할 수 없다.\n-야생의 정기 : 목표 대상이 울디안 혹은 울피안일 경우 알아낸다.","ReplaceableTextures\\CommandButtons\\BTNIceTrollShaman.blp")
    call CreateQuestBJ(0,"울디안","-공격\n-아군 확인\n-야생의 결속 : 울디안과 울피안은 동맹 상태로 시작한다.\n-야생의 길 : 진명을 내어야 사용할 수 있다. 20초 뒤까지 자신이 진명이면 치스의 정체를 알아낼 수 있다. 1회용.","ReplaceableTextures\\CommandButtons\\BTNBeastMaster.blp")
    call CreateQuestBJ(0,"울피안","-적군 확인\n-야생의 결속 : 울디안과 울피안은 동맹 상태로 시작한다.\n@정화의 주술 : 3분 후에 획득. 카눌라의 스킬 '혼돈의 주술'의 대상이나 카눌라 자신에게 사용했을 경우 즉시 살해한다. 1회용.","ReplaceableTextures\\CommandButtons\\BTNDruidOfTheClaw.blp")
    call CreateQuestBJ(2,"↓ 트롤 반란자 ↓","|c00ff00ff- 데카|r (트롤 버서커)\n|c00ff00ff- 네오니스|r (쉐도우 시프)\n|c00ff00ff- 카'눌라|r (카오스 샤먼)\n|c00ff00ff- 카즈로우|r (카오스 어설트)\n|c00ff00ff- 세이로우|r (파나틱 어설트)","ReplaceableTextures\\CommandButtons\\BTNBerserkForTrolls.blp")
    call CreateQuestBJ(2,"데카","-최상급 공격\n-상급 아군 확인\n-블러디 매드니스 : 공격받았을 때, 마나 25를 사용하여 생존할 수 있다.","ReplaceableTextures\\CommandButtons\\BTNHeadHunterBerserker.blp")
    call CreateQuestBJ(2,"네오니스","-공격\n-적군 확인\n-전체 채팅(정체 비공개)\n-지원 : 목표 대상의 마나를 30 증가시킨다. 스스로에게는 사용할 수 없다.\n-위장 : 얼음 부족의 이름으로 공표할 시 얼음 부족의 '아군 확인' 및 '스캔' 스킬의 결과를 맞는 것으로 속일 수 있다.\n@네비아탄의 화신 : 2분 후에 획득. 목표 대상이 카'눌라인 경우 알아낸다.","ReplaceableTextures\\CommandButtons\\BTNShadowHunter.blp")
    call CreateQuestBJ(2,"카'눌라","-적군 스캔\n-혼돈의 주술 : 진명을 공표하고 있을 때 사용할 수 있다. 대상이 아군이면 60초 후 대상의 정체를 알아낸다.\n-파괴자의 인도 : 데카에게 사용 가능. 성공시 카눌라는 즉사한다. 블러드 매드니스가 존재할 경우, 데카의 마나를 최대치로 회복시키고 광폭화 상태로 만든다. 블러드 매드니스가 사라졌을 경우, 데카에게 블러드 매드니스 스킬을 추가한다. 실패 시 스킬이 사라진다.","ReplaceableTextures\\CommandButtons\\BTNDarkTrollShadowPriest.blp")
    call CreateQuestBJ(2,"카즈로우","-상급 공격\n-광폭화 : 진명을 공표하고 있을 때 사용할 수 있다. 자신의 공격 및 진실의 보석의 쿨다운을 초기화한다. 사용 시 광폭화 사용 사실이 모든 플레이어에게 알려진다.(스킬을 사용한 것이 카즈로우인지 세이로우인지는 알려지지 않는다.)\n-무모한 돌진 : 대상을 무조건 살해한다. 성공시 네비아탄의 가호가 없다면 자신도 즉사한다. 족장 보호가 발동된 상태의 치스에게 사용하면 돌격이 실패하고, 사토시와 당신이 서로 정체를 알게 된다.\n-다크 스킨 : 2번 공격당해야 사망한다.\n-돌격대의 결속 : 카즈로우와 세이로우는 서로 동맹 상태로 시작한다.","ReplaceableTextures\\CommandButtons\\BTNDarkTroll.blp")
    call CreateQuestBJ(2,"세이로우","-상급 아군 확인\n-배틀 센스\n-광폭화 : 진명을 공표하고 있을 때 사용할 수 있다. 아군 확인 스킬을 잃고, 상급 공격과 다크 스킨을 획득한다. 사용하고 20초 후에 광폭화 사용 사실이 모든 플레이어에게 알려진다.(스킬을 사용한 것이 카즈로우인지 세이로우인지는 알려지지 않는다.)\n-무모한 돌진 : 대상을 무조건 살해한다. 성공시 네비아탄의 가호가 없다면 자신도 즉사한다. 족장 보호가 발동된 상태의 치스에게 사용하면 돌격이 실패하고, 사토시와 당신이 서로 정체를 알게 된다.\n-돌격대의 결속 : 카즈로우와 세이로우는 서로 동맹 상태로 시작한다.\n@상급 공격 : 광폭화 스킬 사용 시 획득.\n@다크 스킨 : 광폭화 스킬 사용 시 획득. 2번 공격당해야 사망한다.","ReplaceableTextures\\CommandButtons\\BTNDarkTrollTrapper.blp")
endfunction

function Yr takes nothing returns nothing
    call SetMapFlag(MAP_OBSERVERS,true)
    call ShowInterfaceForceOff(bj_FORCE_ALL_PLAYERS,.0)
    call ShowInterfaceForceOn(bj_FORCE_PLAYER[0],.0)
    call DialogAddButtonBJ(V,"랜덤 모드 선택")
    set E[9]=bj_lastCreatedButton
    call nr(.1)
    call DialogAddButtonBJ(V,"왕자들의 내전")
    set E[1]=bj_lastCreatedButton
    call nr(.1)
    call DialogAddButtonBJ(V,"태초의 전쟁")
    set E[2]=bj_lastCreatedButton
    call nr(.1)
    call DialogAddButtonBJ(V,"리델루트 황야")
    set E[3]=bj_lastCreatedButton
    call nr(.1)
    call DialogAddButtonBJ(V,"트롤 부족의 반란")
    set E[4]=bj_lastCreatedButton
    call nr(.1)
    call DialogSetMessage(V,"모드 선택 (제한시간 15초)")
    call DialogDisplayBJ(true,V,Player(0))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,10.,"방장이 모드를 선택중입니다. 잠시만 기다려 주세요.")
    call StartTimerBJ(T,false,15.)
    call DestroyTrigger(GetTriggeringTrigger())
endfunction

function Zr takes nothing returns boolean
    return(GetClickedButton()==E[9])
endfunction

function vi takes nothing returns boolean
    return(GetClickedButton()==E[1])
endfunction

function ei takes nothing returns boolean
    return(GetClickedButton()==E[2])
endfunction

function xi takes nothing returns boolean
    return(GetClickedButton()==E[3])
endfunction

function oi takes nothing returns boolean
    return(GetClickedButton()==E[4])
endfunction

function ri takes nothing returns nothing
    local integer a=GetRandomInt(1,4)
    call ShowInterfaceForceOff(bj_FORCE_PLAYER[0],.0)
    if(Zr()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,10.,"|c00ffff00모드 랜덤 선택|r")
        if a==1 then
            set U="왕자들의 내전"
            call TriggerExecute(ve)
            set X[1]='H005'
            set X[2]='H006'
            set X[3]='H00A'
            set X[4]='H009'
            set X[5]='H00B'
            set X[6]='H008'
            set X[7]='H007'
            set X[8]='H000'
            set X[9]='H002'
            set X[$A]='H001'
            set X[$B]='H003'
            set X[$C]='H004'
        elseif a==2 then
            set U="태초의 전쟁"
            call TriggerExecute(ee)
            set X[1]='H00D'
            set X[2]='H00C'
            set X[3]='H00E'
            set X[4]='H00F'
            set X[5]='H00G'
            set X[6]='H00H'
            set X[7]='H00I'
            set X[8]='H00J'
            set X[9]='H00K'
            set X[$A]='H00L'
            set X[$B]='H00M'
            set X[$C]='H00N'
        elseif a==3 then
            set U="리델루트 황야"
            call TriggerExecute(xe)
            set X[1]='H00O'
            set X[2]='H00S'
            set X[3]='H00R'
            set X[4]='H00T'
            set X[5]='H00P'
            set X[6]='H00Q'
            set X[7]='H00U'
            set X[8]='H00Y'
            set X[9]='H00V'
            set X[$A]='H00X'
            set X[$B]='H00W'
            set X[$C]='H00Z'
        elseif a==4 then
            set U="트롤 부족의 반란"
            call TriggerExecute(oe)
            set X[1]='H010'
            set X[2]='H011'
            set X[3]='H012'
            set X[4]='H013'
            set X[5]='H014'
            set X[6]='H015'
            set X[7]='H016'
            set X[8]='H017'
            set X[9]='H018'
            set X[$A]='H019'
            set X[$B]='H01A'
            set X[$C]='H01B'
        endif
    endif
    if(vi()) then
        set U="왕자들의 내전"
        call TriggerExecute(ve)
        set X[1]='H005'
        set X[2]='H006'
        set X[3]='H00A'
        set X[4]='H009'
        set X[5]='H00B'
        set X[6]='H008'
        set X[7]='H007'
        set X[8]='H000'
        set X[9]='H002'
        set X[$A]='H001'
        set X[$B]='H003'
        set X[$C]='H004'
    endif
    if(ei()) then
        set U="태초의 전쟁"
        call TriggerExecute(ee)
        set X[1]='H00D'
        set X[2]='H00C'
        set X[3]='H00E'
        set X[4]='H00F'
        set X[5]='H00G'
        set X[6]='H00H'
        set X[7]='H00I'
        set X[8]='H00J'
        set X[9]='H00K'
        set X[$A]='H00L'
        set X[$B]='H00M'
        set X[$C]='H00N'
    endif
    if(xi()) then
        set U="리델루트 황야"
        call TriggerExecute(xe)
        set X[1]='H00O'
        set X[2]='H00S'
        set X[3]='H00R'
        set X[4]='H00T'
        set X[5]='H00P'
        set X[6]='H00Q'
        set X[7]='H00U'
        set X[8]='H00Y'
        set X[9]='H00V'
        set X[$A]='H00X'
        set X[$B]='H00W'
        set X[$C]='H00Z'
    endif
    if(oi()) then
        set U="트롤 부족의 반란"
        call TriggerExecute(oe)
        set X[1]='H010'
        set X[2]='H011'
        set X[3]='H012'
        set X[4]='H013'
        set X[5]='H014'
        set X[6]='H015'
        set X[7]='H016'
        set X[8]='H017'
        set X[9]='H018'
        set X[$A]='H019'
        set X[$B]='H01A'
        set X[$C]='H01B'
    endif
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,10.,("모드 - |c00ffff00"+(U+"|r")))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,10.,"직업을 분배중입니다.")
    call TriggerExecute(ae)
    call DisableTrigger(GetTriggeringTrigger())
endfunction

function ai takes nothing returns boolean
    return(U=="없음")
endfunction

function ni takes nothing returns nothing
    local integer mr
    call PauseTimerBJ(true,T)
    set P[1]=GetRectCenter(Iv)
    set P[2]=GetRectCenter(Av)
    set P[3]=GetRectCenter(Nv)
    set P[4]=GetRectCenter(bv)
    set P[5]=GetRectCenter(Bv)
    set P[6]=GetRectCenter(cv)
    set P[7]=GetRectCenter(Cv)
    set P[8]=GetRectCenter(dv)
    set P[9]=GetRectCenter(Dv)
    set P[$A]=GetRectCenter(fv)
    set P[$B]=GetRectCenter(Fv)
    set P[$C]=GetRectCenter(gv)
    call DestroyTrigger(ie)
    if(ai()) then
        call ShowInterfaceForceOff(bj_FORCE_PLAYER[0],.0)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,10.,"방장이 모드를 선택하지 않아 |c00ffff00왕자들의 내전|r이 선택되었습니다.\n\n직업을 분배중입니다. \n5초 후 게임이 시작됩니다.")
        set U="왕자들의 내전"
        call TriggerExecute(ve)
        set X[1]='H005'
        set X[2]='H006'
        set X[3]='H00A'
        set X[4]='H009'
        set X[5]='H00B'
        set X[6]='H008'
        set X[7]='H007'
        set X[8]='H000'
        set X[9]='H002'
        set X[$A]='H001'
        set X[$B]='H003'
        set X[$C]='H004'
    endif
    set mr=1
    loop
        exitwhen mr>$C
        call SetPlayerName(Player(-1+((mr))),("["+(I2S((mr))+("]"+(" "+GetPlayerName(Player(-1+((mr)))))))))
        set mr=mr+1
    endloop
    set H[1]=("|cffff0000"+(GetPlayerName(Player(0))+"|r"))
    set H[2]=("|cff0042ff"+(GetPlayerName(Player(1))+"|r"))
    set H[3]=("|cff17e6b9"+(GetPlayerName(Player(2))+"|r"))
    set H[4]=("|cff540081"+(GetPlayerName(Player(3))+"|r"))
    set H[5]=("|cffffff00"+(GetPlayerName(Player(4))+"|r"))
    set H[6]=("|cffff8000"+(GetPlayerName(Player(5))+"|r"))
    set H[7]=("|cff20c000"+(GetPlayerName(Player(6))+"|r"))
    set H[8]=("|cffe55bb0"+(GetPlayerName(Player(7))+"|r"))
    set H[9]=("|cff969696"+(GetPlayerName(Player(8))+"|r"))
    set H[$A]=("|cff7ebff1"+(GetPlayerName(Player(9))+"|r"))
    set H[$B]=("|cff106246"+(GetPlayerName(Player($A))+"|r"))
    set H[$C]=("|c00804000"+(GetPlayerName(Player($B))+"|r"))
    call TriggerExecute(ne)
    call DestroyTrigger(GetTriggeringTrigger())
endfunction

function Ei takes nothing returns nothing
    local integer mr
    local force F=br(Condition(function Mr))
    local integer Xi=CountPlayersInForceBJ(F)
    local string Oi
    if U=="왕자들의 내전" then
        if Xi==$C then
            set Oi="111111111111"
        elseif Xi==$B then
            set Oi="111111011111"
        elseif Xi==$A then
            set Oi="111111011110"
        elseif Xi==9 then
            set Oi="111110011110"
        elseif Xi==8 then
            set Oi="111110011010"
        elseif Xi==1 then
            set Oi="100000000000"
        else
            call CustomDefeatBJ(GetLocalPlayer(),"사람 수가 부족합니다!")
        endif
    elseif U=="태초의 전쟁" then
        if Xi==$C then
            set Oi="111111111111"
        elseif Xi==$B then
            set Oi="111111111110"
        elseif Xi==$A then
            set Oi="111110111110"
        elseif Xi==9 then
            set Oi="111110111100"
        elseif Xi==8 then
            set Oi="111100101110"
        elseif Xi==1 then
            set Oi="000000010000"
        else
            call CustomDefeatBJ(GetLocalPlayer(),"사람 수가 부족합니다!")
        endif
    elseif U=="리델루트 황야" then
        if Xi==$C then
            set Oi="111111111111"
        elseif Xi==$B then
            set Oi="111110111111"
        elseif Xi==$A then
            set Oi="111110111110"
        elseif Xi==9 then
            set Oi="111100111110"
        elseif Xi==8 then
            set Oi="111100111010"
        elseif Xi==1 then
            set Oi="000000010000"
        else
            call CustomDefeatBJ(GetLocalPlayer(),"사람 수가 부족합니다!")
        endif
    elseif U=="트롤 부족의 반란" then
        if Xi==$C then
            set Oi="111111111111"
        elseif Xi==$B then
            set Oi="111011111111"
        elseif Xi==$A then
            set Oi="111011111110"
        elseif Xi==9 then
            set Oi="111110011110"
        elseif Xi==8 then
            set Oi="111010011110"
        elseif Xi==1 then
            set Oi="000000010000"
        else
            call CustomDefeatBJ(GetLocalPlayer(),"사람 수가 부족합니다!")
        endif
    endif
    set mr=1
    loop
        exitwhen CountPlayersInForceBJ(F)==0
        if SubStringBJ(Oi,mr,mr)!="0" then
            set O[(mr)]=ForcePickRandomPlayer((F))
            call ForceRemovePlayer((F),O[(mr)])
            call CreateNUnitsAtLoc(1,X[(mr)],O[(mr)],GetPlayerStartLocationLoc(O[(mr)]),bj_UNIT_FACING)
            set o[(1+GetPlayerId(O[(mr)]))]=bj_lastCreatedUnit
            set b[(mr)]=GetHeroProperName(bj_lastCreatedUnit)
            set D[(1+GetPlayerId(O[(mr)]))]=(mr)
            call DisplayTimedTextToPlayer(O[(mr)],.8,0,8.,("당신은 |c00ff00ff"+(b[(mr)]+"|r입니다.")))
            call CameraSetupApplyForPlayer(true,Gv,O[(mr)],.0)
        endif
        set mr=mr+1
    endloop
    call TriggerExecute(Ve)
endfunction

function Ii takes nothing returns boolean
    return(U=="왕자들의 내전")
endfunction

function Ai takes nothing returns boolean
    return(U=="태초의 전쟁")
endfunction

function Ni takes nothing returns boolean
    return(U=="리델루트 황야")
endfunction

function bi takes nothing returns boolean
    return(U=="트롤 부족의 반란")
endfunction

function Bi takes nothing returns nothing
    if(Ii()) then
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,"|c00ffff80카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.\n\n당신이 살해당하면 단테스측은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[1],O[1])
        call DisplayTimedTextToPlayer(O[2],.8,0,8.,"|c00ffff80단테스를 도와 카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[2])
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"|c00ffff80단테스를 도와 카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[3])
        set j[3]=2
        call DisplayTimedTextToPlayer(O[4],.8,0,8.,"|c00ffff80단테스를 도와 카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[4])
        call DisplayTimedTextToPlayer(O[5],.8,0,8.,"|c00ffff80단테스를 도와 카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[5])
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"|c00ffff80단테스를 도와 카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[6])
        call DisplayTimedTextToPlayer(O[7],.8,0,8.,"|c00ffff80단테스를 도와 카이의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[7])
        call DisplayTimedTextToPlayer(O[8],.8,0,8.,"|c00ffff80단테스의 세력을 파멸시켜야 합니다.\n단테스를 살해하면 승리합니다.\n\n당신이 살해당하면 카이측은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[2],O[8])
        call DisplayTimedTextToPlayer(O[9],.8,0,8.,"|c00ffff80카이를 도와 단테스의 세력을 파멸시켜야 합니다.\n단테스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[9])
        call DisplayTimedTextToPlayer(O[$A],.8,0,8.,"|c00ffff80카이를 도와 단테스의 세력을 파멸시켜야 합니다.\n단테스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$A])
        set j[$A]=1
        call DisplayTimedTextToPlayer(O[$B],.8,0,8.,"|c00ffff80카이를 도와 단테스의 세력을 파멸시켜야 합니다.\n단테스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$B])
        call DisplayTimedTextToPlayer(O[$C],.8,0,8.,"|c00ffff80카이를 도와 단테스의 세력을 파멸시켜야 합니다.\n단테스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$C])
    endif
    if(Ai()) then
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.\n\n당신과 케인이 살해당하면 지상 연합군은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[1],O[1])
        call DisplayTimedTextToPlayer(O[2],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.\n\n당신과 라엘이 살해당하면 지상 연합군은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[1],O[2])
        set j[2]=1
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"|c00ffff80지상연합의 세력원으로서 다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[3])
        call DisplayTimedTextToPlayer(O[4],.8,0,8.,"|c00ffff80지상연합의 세력원으로서 다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[4])
        call DisplayTimedTextToPlayer(O[5],.8,0,8.,"|c00ffff80지상연합의 세력원으로서 다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[5])
        set j[5]=1
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"|c00ffff80지상연합의 세력원으로서 다크니스의 세력을 파멸시켜야 합니다.\n엘타스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[6])
        call DisplayTimedTextToPlayer(O[7],.8,0,8.,"|c00ffff80지상연합의 세력을 파멸시켜야 합니다.\n케인/라엘을 모두 살해하면 승리합니다.\n\n당신이 살해당하면 다크니스는 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[2],O[7])
        set j[7]=2
        call DisplayTimedTextToPlayer(O[8],.8,0,8.,"|c00ffff80다크니스의 세력원으로서 지상연합의 세력을 파멸시켜야 합니다.\n케인/라엘을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[8])
        call DisplayTimedTextToPlayer(O[9],.8,0,8.,"|c00ffff80다크니스의 세력원으로서 지상연합의 세력을 파멸시켜야 합니다.\n케인/라엘을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[9])
        call DisplayTimedTextToPlayer(O[$A],.8,0,8.,"|c00ffff80다크니스의 세력원으로서 지상연합의 세력을 파멸시켜야 합니다.\n케인/라엘을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$A])
        call DisplayTimedTextToPlayer(O[$B],.8,0,8.,"|c00ffff80다크니스의 세력원으로서 지상연합의 세력을 파멸시켜야 합니다.\n케인/라엘을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$B])
        call DisplayTimedTextToPlayer(O[$C],.8,0,8.,"|c00ffff80다크니스의 세력원으로서 지상연합의 세력을 파멸시켜야 합니다.\n케인/라엘을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$C])
    endif
    if(Ni()) then
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,"|c00ffff80가디언의 세력을 파멸시켜야 합니다.\n샤이닝과 기사단을 모두 살해하면 승리합니다.\n\n당신이 살해당하면 다크니스는 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[1],O[1])
        call DisplayTimedTextToPlayer(O[2],.8,0,8.,"|c00ffff80가디언의 세력을 파멸시켜야 합니다.\n샤이닝과 기사단을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[2])
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"|c00ffff80가디언의 세력을 파멸시켜야 합니다.\n샤이닝과 기사단을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[3])
        call DisplayTimedTextToPlayer(O[4],.8,0,8.,"|c00ffff80가디언의 세력을 파멸시켜야 합니다.\n샤이닝과 기사단을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[4])
        call DisplayTimedTextToPlayer(O[5],.8,0,8.,"|c00ffff80가디언의 세력을 파멸시켜야 합니다.\n샤이닝과 기사단을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[5])
        set j[5]=1
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"|c00ffff80가디언의 세력을 파멸시켜야 합니다.\n샤이닝과 기사단을 모두 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[6])
        call DisplayTimedTextToPlayer(O[7],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.\n\n샤이닝과 기사단이 살해당하면 가디언은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[2],O[7])
        call DisplayTimedTextToPlayer(O[8],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[8])
        call DisplayTimedTextToPlayer(O[9],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.\n\n샤이닝과 기사단이 살해당하면 가디언은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[2],O[9])
        call DisplayTimedTextToPlayer(O[$A],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.\n\n샤이닝과 기사단이 살해당하면 가디언은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[2],O[$A])
        call DisplayTimedTextToPlayer(O[$B],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.\n\n샤이닝과 기사단이 살해당하면 가디언은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[2],O[$B])
        call DisplayTimedTextToPlayer(O[$C],.8,0,8.,"|c00ffff80다크니스의 세력을 파멸시켜야 합니다.\n카이를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$C])
        set j[$C]=2
    endif
    if(bi()) then
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,"|c00ffff80그즐리카 트롤의 반란군을 패배시켜야 합니다.\n데카를 살해하면 승리합니다.\n\n당신이 살해당하면 얼음 일족은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[1],O[1])
        call DisplayTimedTextToPlayer(O[2],.8,0,8.,"|c00ffff80치스를 도와 그즐리카 트롤을 파멸시켜야 합니다.\n데카를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[2])
        set j[2]=1
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"|c00ffff80치스를 도와 그즐리카 트롤을 파멸시켜야 합니다.\n데카를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[3])
        set j[3]=1
        call DisplayTimedTextToPlayer(O[4],.8,0,8.,"|c00ffff80치스를 도와 그즐리카 트롤을 파멸시켜야 합니다.\n데카를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[4])
        call DisplayTimedTextToPlayer(O[5],.8,0,8.,"|c00ffff80치스를 도와 그즐리카 트롤을 파멸시켜야 합니다.\n데카를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[5])
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"|c00ffff80치스를 도와 그즐리카 트롤을 파멸시켜야 합니다.\n데카를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[6])
        call SetPlayerAllianceStateBJ(O[6],O[7],2)
        call DisplayTimedTextToPlayer(O[7],.8,0,8.,"|c00ffff80치스를 도와 그즐리카 트롤을 파멸시켜야 합니다.\n데카를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[1],O[7])
        call SetPlayerAllianceStateBJ(O[7],O[6],2)
        call DisplayTimedTextToPlayer(O[7],.8,0,8.,"|c00ffff80얼음 일족을 파멸시켜야 합니다.\n치스를 살해하면 승리합니다.\n\n당신이 살해당하면 그즐리카 트롤은 게임에서 패배합니다.|r")
        call ForceAddPlayer(B[2],O[8])
        call DisplayTimedTextToPlayer(O[9],.8,0,8.,"|c00ffff80데카를 도와 얼음 일족을 파멸시켜야 합니다.\n치스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[9])
        call DisplayTimedTextToPlayer(O[$A],.8,0,8.,"|c00ffff80데카를 도와 얼음 일족을 파멸시켜야 합니다.\n치스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$A])
        call DisplayTimedTextToPlayer(O[$B],.8,0,8.,"|c00ffff80데카를 도와 얼음 일족을 파멸시켜야 합니다.\n치스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$B])
        call SetPlayerAllianceStateBJ(O[$B],O[$C],2)
        set j[$B]=1
        call DisplayTimedTextToPlayer(O[$C],.8,0,8.,"|c00ffff80데카를 도와 얼음 일족을 파멸시켜야 합니다.\n치스를 살해하면 승리합니다.|r")
        call ForceAddPlayer(B[2],O[$C])
        call SetPlayerAllianceStateBJ(O[$C],O[$B],2)
    endif
    call TriggerExecute(Ee)
endfunction

function Ci takes nothing returns boolean
    return(U=="왕자들의 내전")
endfunction

function di takes nothing returns boolean
    return(U=="태초의 전쟁")
endfunction

function Di takes nothing returns boolean
    return(U=="리델루트 황야")
endfunction

function fi takes nothing returns boolean
    return(U=="트롤 부족의 반란")
endfunction

function Fi takes nothing returns nothing
    local integer mr=1
    call DialogClear(G[1])
    call DialogClear(G[2])
    call DialogClear(R)
    call DialogClear(c)
    call DialogClear(av[1])
    call DialogClear(av[2])
    call DialogClear(w[1])
    call DialogClear(w[2])
    call DialogClear(Vv)
    call DialogSetMessage(R,"공표")
    loop
        exitwhen mr>$C
        if b[mr]=="" then
        else
            call DialogAddButtonBJ(R,b[(mr)])
            set I[(mr)]=bj_lastCreatedButton
        endif
        set mr=mr+1
    endloop
    set mr=1
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"|c0080ffff다이얼로그 세팅 중...|r")
    call DialogSetMessage(c,"스캔")
    call DialogSetMessage(av[1],"스캔")
    call DialogSetMessage(av[2],"스캔")
    call DialogSetMessage(G[1],"공격")
    call DialogSetMessage(G[2],"공격")
    call DialogSetMessage(w[1],"리더쉽")
    call DialogSetMessage(w[2],"리더쉽")
    call DialogSetMessage(Vv,"사냥꾼의 표식")
    call DialogAddButtonBJ(c,"[ 아래 중 하나를 선택하세요 ]")
    call DialogAddButtonBJ(av[1],"[ 아래 중 하나를 선택하세요 ]")
    call DialogAddButtonBJ(av[2],"[ 아래 중 하나를 선택하세요 ]")
    call DialogAddButtonBJ(w[1],"[ 아래 중 하나를 선택하세요 ]")
    call DialogAddButtonBJ(w[2],"[ 아래 중 하나를 선택하세요 ]")
    call DialogAddButtonBJ(Vv,"[ 아래 중 하나를 선택하세요 ]")
    if(Ci()) then
        call DialogAddButtonBJ(G[1],b[1])
        set h[1]=bj_lastCreatedButton
        set bj_forLoopAIndex=2
        set bj_forLoopAIndexEnd=7
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[1],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
        call DialogAddButtonBJ(G[2],b[8])
        set h[8]=bj_lastCreatedButton
        set bj_forLoopAIndex=9
        set bj_forLoopAIndexEnd=$C
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[2],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
    endif
    if(di()) then
        call DialogAddButtonBJ(G[1],b[1])
        set h[1]=bj_lastCreatedButton
        set bj_forLoopAIndex=2
        set bj_forLoopAIndexEnd=6
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(w[1],b[bj_forLoopAIndex])
                set W[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[1],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
        call DialogAddButtonBJ(G[2],b[7])
        set h[7]=bj_lastCreatedButton
        set bj_forLoopAIndex=8
        set bj_forLoopAIndexEnd=$C
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(w[2],b[bj_forLoopAIndex])
                set W[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[2],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
    endif
    if(Di()) then
        call DialogClear(ev)
        call DialogSetMessage(ev,"천사의 세례")
        call DialogAddButtonBJ(ev,"유이")
        set xv[9]=bj_lastCreatedButton
        call nr(.1)
        call DialogAddButtonBJ(ev,"로네리스")
        set xv[$A]=bj_lastCreatedButton
        call nr(.1)
        call DialogAddButtonBJ(ev,"수프라")
        set xv[$B]=bj_lastCreatedButton
        call nr(.1)
        call DialogAddButtonBJ(G[1],b[1])
        set h[1]=bj_lastCreatedButton
        set bj_forLoopAIndex=2
        set bj_forLoopAIndexEnd=6
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(w[1],b[bj_forLoopAIndex])
                set W[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[1],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(av[1],b[bj_forLoopAIndex])
                set nv[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
        call DialogAddButtonBJ(G[2],b[7])
        set h[7]=bj_lastCreatedButton
        set bj_forLoopAIndex=8
        set bj_forLoopAIndexEnd=$C
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(w[2],b[bj_forLoopAIndex])
                set W[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[2],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(av[2],b[bj_forLoopAIndex])
                set nv[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
    endif
    if(fi()) then
        call DialogAddButtonBJ(G[1],b[1])
        set h[1]=bj_lastCreatedButton
        set bj_forLoopAIndex=2
        set bj_forLoopAIndexEnd=7
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(w[1],b[bj_forLoopAIndex])
                set W[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[1],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(av[1],b[bj_forLoopAIndex])
                set nv[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
        call DialogAddButtonBJ(G[2],b[8])
        set h[8]=bj_lastCreatedButton
        call DialogAddButtonBJ(Vv,b[8])
        set Ev[8]=bj_lastCreatedButton
        set bj_forLoopAIndex=9
        set bj_forLoopAIndexEnd=$C
        loop
            exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
            if b[bj_forLoopAIndex]=="" then
            else
                call DialogAddButtonBJ(c,b[bj_forLoopAIndex])
                set C[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(G[2],b[bj_forLoopAIndex])
                set h[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(Vv,b[bj_forLoopAIndex])
                set Ev[bj_forLoopAIndex]=bj_lastCreatedButton
                call DialogAddButtonBJ(av[2],b[bj_forLoopAIndex])
                set nv[bj_forLoopAIndex]=bj_lastCreatedButton
            endif
            set bj_forLoopAIndex=bj_forLoopAIndex+1
        endloop
    endif
    call TriggerExecute(Xe)
endfunction

function Gi takes nothing returns boolean
    return(GetPlayerController(Player(-1+(bj_forLoopBIndex)))==MAP_CONTROL_USER)and(GetPlayerSlotState(Player(-1+(bj_forLoopBIndex)))==PLAYER_SLOT_STATE_PLAYING)
endfunction

function hi takes nothing returns nothing
    set bj_forLoopBIndex=1
    set bj_forLoopBIndexEnd=$C
    loop
        exitwhen bj_forLoopBIndex>bj_forLoopBIndexEnd
        if(Gi()) then
            call TriggerRegisterPlayerSelectionEventBJ(Be,Player(-1+(bj_forLoopBIndex)),true)
        else
            call KillUnit(FirstOfGroup(Rr(Player(-1+(bj_forLoopBIndex)),'u000')))
        endif
        set bj_forLoopBIndex=bj_forLoopBIndex+1
    endloop
    call TriggerExecute(Re)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"|c0080ffff그러면, 게임을 시작합니다.|r")
    call ShowInterfaceForceOn(bj_FORCE_ALL_PLAYERS,.0)
    call CreateTimerDialogBJ(e,"턴")
    set x=bj_lastCreatedTimerDialog
    call TimerDialogDisplay(x,true)
    call StartTimerBJ(e,false,90.)
    call StartTimerBJ(S,false,300.)
    call StartTimerBJ(z,false,360.)
    call StartTimerBJ(y,false,120.)
    call StartTimerBJ(iv,false,180.)
endfunction

function ji takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,7)=="-공지")
endfunction

function Ji takes nothing returns nothing
    set Y=SubStringBJ(GetEventPlayerChatString(),8,99)
    call DestroyTrigger(GetTriggeringTrigger())
endfunction

function Ki takes nothing returns nothing
    local integer a=1
    call CreateMultiboardBJ(2,$D,"가디언 스피리츠 택틱스")
    call TriggerSleepAction(.01)
    call MultiboardSetItemIconBJ(bj_lastCreatedMultiboard,1,0,"")
    call MultiboardSetItemWidthBJ(bj_lastCreatedMultiboard,1,0,6.)
    call MultiboardSetItemWidthBJ(bj_lastCreatedMultiboard,2,0,4.)
    call MultiboardSetItemStyleBJ(bj_lastCreatedMultiboard,0,0,true,false)
    loop
        exitwhen a>$C
        if GetPlayerSlotState(Player(-1+(a)))==PLAYER_SLOT_STATE_PLAYING then
            call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,(a),H[(a)])
        else
            call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,(a),"-")
        endif
        set a=a+1
    endloop
    call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,$D,"경과된 시간")
    call MultiboardDisplay(bj_lastCreatedMultiboard,true)
    call EnableTrigger(Ie)
    call EnableTrigger(Ae)
    set Q=0
    set q=0
endfunction

function Li takes nothing returns boolean
    return(q==59)
endfunction

function mi takes nothing returns nothing
    if(Li()) then
        set Q=(Q+1)
        set q=0
    else
        set q=(q+1)
    endif
    call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,2,$D,("|c00FFFFFF"+((I2S(Q)+(":"+I2S(q)))+"|r")))
    call CameraSetupApplyForPlayer(true,Gv,GetLocalPlayer(),.0)
endfunction

function pi takes nothing returns nothing
    local integer a=1
    loop
        exitwhen a>$C
        if IsUnitAliveBJ(o[(1+GetPlayerId(O[a]))]) then
            call CameraSetupApplyForPlayer(true,Gv,Player(-1+((a))),.0)
        endif
    endloop
endfunction

function qi takes nothing returns nothing
    local integer mr=1
    call TriggerExecute(yo)
    loop
        exitwhen mr>$C
        if IsUnitAliveBJ(o[mr]) then
            if A[mr]=="" then
                call CreateTextTagUnitBJ(((I2S((mr))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(Player(-1+((mr))),'u000')),0,12.,100.,100.,10.,0)
                set N[(mr)]=bj_lastCreatedTextTag
                set A[(mr)]=b[(mr)]
            endif
            call SetUnitManaBJ(o[(mr)],(GetUnitStateSwap(UNIT_STATE_MANA,o[(mr)])+(I2R(CountPlayersInForceBJ(Nr(Player(-1+((mr))))))*10.)))
            call SetUnitManaBJ(o[(mr)],(GetUnitStateSwap(UNIT_STATE_MANA,o[(mr)])+10.))
            call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.,"|c0080ffff- 새로운 턴이 시작되었습니다.\n- 모든 영웅의 마나가 |r|c008000ff20|r |c0080ffff회복됩니다.|r")
            if CountPlayersInForceBJ(Nr(Player(-1+(mr))))>1 then
                call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.,("|c0080ffff당신은 동맹으로 인해 |r|c008000ff"+(I2S(((CountPlayersInForceBJ(Nr(Player(-1+((mr)))))-1)*$A))+" |r|c0080ffff마나를 추가로 회복하였습니다.|r")))
            endif
        endif
        set mr=mr+1
    endloop
    set mr=1
    loop
        exitwhen mr>$C
        if A[(mr)]==GetHeroProperName(o[(mr)]) then
            if IsUnitAliveBJ(o[(mr)]) then
                call SetUnitManaBJ(o[(mr)],(GetUnitStateSwap(UNIT_STATE_MANA,o[(mr)])+10.))
                call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.,"-|c00ff0000비공개|r: 진실된 이름으로 인해 마나가 추가로 |c008000ff10|r 회복됩니다.")
                if UnitInventoryCount(o[(mr)])==0 then
                    call UnitAddItemByIdSwapped('I001',o[(mr)])
                    call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.," ")
                    call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.,"-|c00ff0000비공개|r: 진실된 이름으로 인해 진실의 조각 1/3 을 획득했습니다.")
                elseif UnitHasItemOfTypeBJ(o[(mr)],'I001') then
                    call RemoveItem(GetItemOfTypeFromUnitBJ(o[(mr)],'I001'))
                    call UnitAddItemByIdSwapped('I002',o[(mr)])
                    call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.," ")
                    call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.,"-|c00ff0000비공개|r: 진실된 이름으로 인해 진실의 조각 2/3 을 획득했습니다.")
                elseif UnitHasItemOfTypeBJ(o[(mr)],'I002') then
                    call RemoveItem(GetItemOfTypeFromUnitBJ(o[(mr)],'I002'))
                    call UnitAddItemByIdSwapped('I000',o[(mr)])
                    call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.," ")
                    call DisplayTimedTextToPlayer(Player(-1+((mr))),.8,0,8.,"-|c00ff0000비공개|r: 진실된 이름이 결실을 맺어 보석이 완성되었습니다.")
                endif
            endif
        endif
        set mr=mr+1
    endloop
    call StartTimerBJ(e,false,90.)
endfunction

function si takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(GetTriggerPlayer()))]))
endfunction

function Si takes nothing returns nothing
    call Lr((1+GetPlayerId(GetTriggerPlayer())))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,(GetPlayerName(GetTriggerPlayer())+"님께서 나가셨습니다!"))
endfunction

function Ti takes nothing returns boolean
    return((IsUnitType(GetTriggerUnit(),UNIT_TYPE_HERO))and(GetOwningPlayer(GetTriggerUnit())!=GetTriggerPlayer())and(IsUnitAliveBJ(o[(1+GetPlayerId(GetTriggerPlayer()))])))!=null
endfunction

function ui takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,(GetPlayerName(GetTriggerPlayer())+"이 맵핵을 사용하여 다른 사람의 영웅을 훔쳐보고 있습니다!"))
endfunction

function wi takes nothing returns boolean
    return(GetSpellAbilityId()=='A000')
endfunction

function Wi takes nothing returns nothing
    call DialogDisplayBJ(true,R,GetOwningPlayer(GetTriggerUnit()))
    call nr(6.)
    call DialogDisplayBJ(false,R,GetOwningPlayer(GetTriggerUnit()))
endfunction

function Yi takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(GetTriggerPlayer()))]))
endfunction

function zi takes nothing returns nothing
    local integer mr=1
    loop
        exitwhen mr>$C
        if GetClickedButton()==I[mr] then
            call DestroyTextTag(N[(1+GetPlayerId(GetTriggerPlayer()))])
            if(Yi()) then
                return
            endif
            if U=="왕자들의 내전" then
                if mr>7 then
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,10.,10.,100.,0)
                else
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,100.,10.,10.,0)
                endif
            elseif U=="태초의 전쟁" then
                if mr>6 then
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,10.,10.,100.,0)
                else
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,100.,10.,10.,0)
                endif
            elseif U=="리델루트 황야" then
                if mr>6 then
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,10.,10.,100.,0)
                else
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,100.,10.,10.,0)
                endif
            elseif U=="트롤 부족의 반란" then
                if mr>7 then
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,100.,10.,10.,0)
                else
                    call CreateTextTagUnitBJ(((I2S((1+GetPlayerId(GetTriggerPlayer())))+" : ")+b[(mr)]),GroupPickRandomUnit(Rr(GetTriggerPlayer(),'u000')),0,12.,10.,10.,100.,0)
                endif
            endif
            call SetTextTagAgeBJ(bj_lastCreatedTextTag,100000000.)
            set N[(1+GetPlayerId(GetTriggerPlayer()))]=bj_lastCreatedTextTag
            if A[(1+GetPlayerId(GetTriggerPlayer()))]=="" then
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,10.,(H[(1+GetPlayerId(GetTriggerPlayer()))]+(" : |c00ff0000"+(b[(mr)]+"|r 로 공표를 하였습니다."))))
            else
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,10.,(H[(1+GetPlayerId(GetTriggerPlayer()))]+((" : |c000080ff"+A[(1+GetPlayerId(GetTriggerPlayer()))])+(("|r -> |c00ff0000"+b[(mr)])+"|r 로 공표를 하였습니다."))))
            endif
            call SetUnitManaBJ(o[(1+GetPlayerId(GetTriggerPlayer()))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetTriggerPlayer()))])+5.))
            set A[(1+GetPlayerId(GetTriggerPlayer()))]=b[(mr)]
return
        endif
        set mr=mr+1
    endloop
endfunction

function va takes nothing returns boolean
    return(GetSpellAbilityId()=='A004')
endfunction

function ea takes nothing returns nothing
    local player u=GetOwningPlayer(GetSpellTargetUnit())
    if IsPlayerAlly(GetOwningPlayer(GetTriggerUnit()),(u)) then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"그 대상과는 이미 동맹을 맺고 있습니다.")
    else
        call SetPlayerAllianceStateBJ(GetOwningPlayer(GetTriggerUnit()),(u),2)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,(H[(1+GetPlayerId((u)))]+" 에게 동맹 관계를 설정하였습니다."))
        call DisplayTimedTextToPlayer((u),.8,0,8.,(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+" 가 당신에게 동맹 관계를 설정하였습니다."))
    endif
endfunction

function oa takes nothing returns boolean
    return(GetSpellAbilityId()=='A005')
endfunction

function ra takes nothing returns nothing
    local player u=GetOwningPlayer(GetSpellTargetUnit())
    if IsPlayerAlly(GetOwningPlayer(GetTriggerUnit()),(u)) then
        call SetPlayerAllianceStateBJ(GetOwningPlayer(GetTriggerUnit()),(u),0)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,(H[(1+GetPlayerId((u)))]+" 와의 동맹관계를 파기하였습니다."))
        call DisplayTimedTextToPlayer((u),.8,0,8.,(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+" 가 당신과의 동맹관계를 파기하였습니다."))
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"그 대상과는 동맹 관계가 아닙니다.")
    endif
endfunction

function aa takes nothing returns boolean
    return(GetSpellAbilityId()=='A009')or(GetSpellAbilityId()=='A02J')
endfunction

function na takes nothing returns boolean
    return(aa())
endfunction

function Va takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="치스")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="사토시")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="즈윈라")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="토크라")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="울디안")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="울피안")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="하치")
endfunction

function Ea takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetTriggerUnit()),B[1]))and(IsPlayerInForce(GetOwningPlayer(GetSpellTargetUnit()),B[2]))and("네오니스"==GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]))and(Va())
endfunction

function Xa takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="카이")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="카스파")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="투마")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="아린")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="크레이트")
endfunction

function Oa takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetTriggerUnit()),B[2]))and(IsPlayerInForce(GetOwningPlayer(GetSpellTargetUnit()),B[1]))and("소엔"==GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]))and(Xa())
endfunction

function Ra takes nothing returns boolean
    return(Ea())or(Oa())
endfunction

function Ia takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetTriggerUnit()),B[1]))and(IsPlayerInForce(GetOwningPlayer(GetSpellTargetUnit()),B[2]))
endfunction

function Aa takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetTriggerUnit()),B[2]))and(IsPlayerInForce(GetOwningPlayer(GetSpellTargetUnit()),B[1]))
endfunction

function Na takes nothing returns boolean
    return(Ia())or(Aa())
endfunction

function ba takes nothing returns boolean
    return(Na())
endfunction

function Ba takes nothing returns boolean
    return("하치"!=GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]))and(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]==GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]))
endfunction

function ca takes nothing returns boolean
    return(Ra())
endfunction

function Ca takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("누군가가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+" 을 살피고 있습니다.")))
    if(ca()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("확인에 성공했습니다. 이 사람은 "+(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"입니다.")))
    else
        if(Ba()) then
            if(ba()) then
                call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"확인에 실패하였습니다.")
            else
                call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("확인에 성공했습니다. 이 사람은 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"입니다.")))
            endif
        else
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"확인에 실패하였습니다.")
        endif
    endif
endfunction

function Da takes nothing returns boolean
    return(GetSpellAbilityId()=='A008')or(GetSpellAbilityId()=='A03H')
endfunction

function fa takes nothing returns boolean
    return(Da())
endfunction

function Fa takes nothing returns nothing
    local player u=GetOwningPlayer(GetSpellTargetUnit())
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("누군가가 "+(H[(1+GetPlayerId((u)))]+" 을 살피고 있습니다.")))
    if Rv[(1+GetPlayerId(u))] then
        set Rv[(1+GetPlayerId((u)))]=false
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080미명의 안개|r에 가려져 정확한 탐색이 불가능하다.")
        call DisplayTimedTextToPlayer(O[4],.8,0,8.,(("-|c00ff0000비공개|r: |c00ff8080"+(GetHeroProperName(GetTriggerUnit())+("|r가 "+H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])))+"를 |c00ff8080배틀 센스|r로 확인하려 했습니다!"))
return
    endif
    if A[(1+GetPlayerId(u))]!=b[D[(1+GetPlayerId(u))]] then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"확인에 실패하였습니다.")
    elseif pr(GetOwningPlayer(GetTriggerUnit()),u)and"하치"!=GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("확인에 성공했습니다. 이 사람은 "+(b[D[(1+GetPlayerId((u)))]]+"입니다.")))
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"확인에 실패하였습니다.")
    endif
endfunction

function Ga takes nothing returns boolean
    return(GetSpellAbilityId()=='A03T')or(GetSpellAbilityId()=='A040')
endfunction

function ha takes nothing returns boolean
    return(Ga())
endfunction

function Ha takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetTriggerUnit()),B[1]))
endfunction

function ja takes nothing returns nothing
    set d[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("누군가가 "+(H[d[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]]+" 을 살피고 있습니다.")))
    if(Ha()) then
        call DialogDisplayBJ(true,av[2],GetOwningPlayer(GetTriggerUnit()))
    else
        call DialogDisplayBJ(true,av[1],GetOwningPlayer(GetTriggerUnit()))
    endif
endfunction

function ka takes nothing returns boolean
    return(GetSpellAbilityId()=='A00T')or(GetSpellAbilityId()=='A015')
endfunction

function Ka takes nothing returns boolean
    return(ka())
endfunction

function la takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetTriggerUnit()),B[1]))
endfunction

function La takes nothing returns nothing
    set d[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("누군가가 "+(H[d[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]]+" 을 살피고 있습니다.")))
    if(la()) then
        call DialogDisplayBJ(true,av[1],GetOwningPlayer(GetTriggerUnit()))
    else
        call DialogDisplayBJ(true,av[2],GetOwningPlayer(GetTriggerUnit()))
    endif
endfunction

function Ma takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('S00A',o[d[(1+GetPlayerId(GetTriggerPlayer()))]])!=0)and(IsPlayerInForce(GetTriggerPlayer(),B[1]))
endfunction

function pa takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('S001',o[d[(1+GetPlayerId(GetTriggerPlayer()))]])!=0)and(IsPlayerInForce(GetTriggerPlayer(),B[2]))
endfunction

function Pa takes nothing returns nothing
    local integer mr=1
    loop
        exitwhen mr>$C
        if GetClickedButton()==nv[mr] then
            if b[mr]!="하치" then
                if (1+GetPlayerId(O[(mr)]))==d[(1+GetPlayerId(GetTriggerPlayer()))] then
                    call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("성공했습니다. 이 사람은 "+(b[(mr)]+"입니다.")))
                else
                    if b[mr]==A[d[(1+GetPlayerId(GetTriggerPlayer()))]] then
                        if mr<8 then
                            if(Ma()) then
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("성공했습니다. 이 사람은 "+(A[d[(1+GetPlayerId(GetTriggerPlayer()))]]+"입니다.")))
                            else
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                            endif
                        else
                            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                        endif
                        if mr>7 then
                            if(pa()) then
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("성공했습니다. 이 사람은 "+(A[d[(1+GetPlayerId(GetTriggerPlayer()))]]+"입니다.")))
                            else
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                            endif
                        else
                            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                        endif
                    else
                        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                    endif
                endif
            else
                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
            endif
            return
        endif
        set mr=mr+1
    endloop
endfunction

function Qa takes nothing returns boolean
    return(GetSpellAbilityId()=='A016')or(GetSpellAbilityId()=='A01L')or(GetSpellAbilityId()=='A037')or(GetSpellAbilityId()=='A02Q')or(GetSpellAbilityId()=='A017')or(GetSpellAbilityId()=='A01M')or(GetSpellAbilityId()=='A036')
endfunction

function sa takes nothing returns boolean
    return(Qa())
endfunction

function Sa takes nothing returns nothing
    set d[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("누군가가 "+(H[d[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]]+" 을 살피고 있습니다.")))
    call DialogDisplayBJ(true,c,GetOwningPlayer(GetTriggerUnit()))
endfunction

function Ta takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('S00A',o[d[(1+GetPlayerId(GetTriggerPlayer()))]])!=0)and(IsPlayerInForce(GetTriggerPlayer(),B[1]))
endfunction

function ua takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('S001',o[d[(1+GetPlayerId(GetTriggerPlayer()))]])!=0)and(IsPlayerInForce(GetTriggerPlayer(),B[2]))
endfunction

function Ua takes nothing returns nothing
    local integer mr=1
    loop
        exitwhen mr>$C
        if GetClickedButton()==C[mr] then
            if b[mr]!="하치" then
                if (1+GetPlayerId(O[(mr)]))==d[(1+GetPlayerId(GetTriggerPlayer()))] then
                    call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("성공했습니다. 이 사람은 "+(b[(mr)]+"입니다.")))
                else
                    if b[mr]==A[d[(1+GetPlayerId(GetTriggerPlayer()))]] then
                        if mr<8 then
                            if(Ta()) then
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("성공했습니다. 이 사람은 "+(A[d[(1+GetPlayerId(GetTriggerPlayer()))]]+"입니다.")))
                            else
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                            endif
                        else
                            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                        endif
                        if mr>7 then
                            if(ua()) then
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("성공했습니다. 이 사람은 "+(A[d[(1+GetPlayerId(GetTriggerPlayer()))]]+"입니다.")))
                            else
                                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                            endif
                        else
                            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                        endif
                    else
                        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
                    endif
                endif
            else
                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"스캔에 실패하였습니다.")
            endif
            return
        endif
        set mr=mr+1
    endloop
endfunction

function Wa takes nothing returns boolean
    return(GetSpellAbilityId()=='A01B')or(GetSpellAbilityId()=='A01A')
endfunction

function ya takes nothing returns boolean
    return(Wa())
endfunction

function Ya takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="샤이닝")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="단테스")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카이")
endfunction

function za takes nothing returns boolean
    return(Ya())
endfunction

function Za takes nothing returns nothing
    if(za()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 지휘관(|c00ff8080카이, 단테스, 샤이닝|r)이다.")
    else
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 이 사람은 |c00ff0000"+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"|r이다!")))
    endif
endfunction

function en takes nothing returns boolean
    return(GetSpellAbilityId()=='A002')or(GetSpellAbilityId()=='A01D')or(GetSpellAbilityId()=='A003')or(GetSpellAbilityId()=='A01Z')
endfunction

function xn takes nothing returns boolean
    return(en())
endfunction

function on takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetTriggerUnit()),B[1]))
endfunction

function rn takes nothing returns nothing
    set f[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    if(on()) then
        call DialogDisplayBJ(true,G[2],GetOwningPlayer(GetTriggerUnit()))
        call nr(6.)
        call DialogDisplayBJ(false,G[2],GetOwningPlayer(GetTriggerUnit()))
    else
        call DialogDisplayBJ(true,G[1],GetOwningPlayer(GetTriggerUnit()))
        call nr(6.)
        call DialogDisplayBJ(false,G[1],GetOwningPlayer(GetTriggerUnit()))
    endif
endfunction

function an takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(GetTriggerPlayer()))]))
endfunction

function nn takes nothing returns boolean
    return(U=="리델루트 황야")and(GetHeroProperName(o[f[(1+GetPlayerId(GetTriggerPlayer()))]])=="카이")and(IsUnitAliveBJ(o[(1+GetPlayerId(O[2]))]))
endfunction

function Vn takes nothing returns boolean
    return(U=="왕자들의 내전")and(GetHeroProperName(o[f[(1+GetPlayerId(GetTriggerPlayer()))]])=="카이")and(IsUnitAliveBJ(o[(1+GetPlayerId(O[9]))]))
endfunction

function En takes nothing returns boolean
    return(U=="왕자들의 내전")and(GetHeroProperName(o[f[(1+GetPlayerId(GetTriggerPlayer()))]])=="단테스")and(IsUnitAliveBJ(o[(1+GetPlayerId(O[3]))]))
endfunction

function Xn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[2]))]))or(IsUnitAliveBJ(o[(1+GetPlayerId(O[3]))]))
endfunction

function On takes nothing returns boolean
    return(U=="트롤 부족의 반란")and(GetHeroProperName(o[f[(1+GetPlayerId(GetTriggerPlayer()))]])=="치스")and(Xn())
endfunction

function Rn takes nothing returns boolean
    return(nn())or(Vn())or(En())or(On())
endfunction

function In takes nothing returns boolean
    return(Rn())
endfunction

function An takes nothing returns boolean
    return(GetHeroProperName(o[f[(1+GetPlayerId(GetTriggerPlayer()))]])=="라엘")and(IsUnitAliveBJ(o[(1+GetPlayerId(O[6]))]))and(GetUnitAbilityLevelSwapped('A01X',o[(1+GetPlayerId(O[6]))])>0)and(GetUnitAbilityLevelSwapped('A01X',o[(1+GetPlayerId(O[6]))])<3)
endfunction

function Nn takes nothing returns boolean
    return(GetHeroProperName(o[f[(1+GetPlayerId(GetTriggerPlayer()))]])=="엘타스")and(IsUnitAliveBJ(o[(1+GetPlayerId(O[$C]))]))and(GetUnitAbilityLevelSwapped('S005',o[(1+GetPlayerId(O[$C]))])>0)and(GetUnitAbilityLevelSwapped('S005',o[(1+GetPlayerId(O[$C]))])<3)
endfunction

function bn takes nothing returns boolean
    return(b[D[f[(1+GetPlayerId(GetTriggerPlayer()))]]]==b[bj_forLoopBIndex])
endfunction

function Bn takes nothing returns boolean
    return(GetClickedButton()==h[bj_forLoopBIndex])
endfunction

function cn takes nothing returns nothing
    set bj_forLoopBIndex=1
    set bj_forLoopBIndexEnd=$C
    loop
        exitwhen bj_forLoopBIndex>bj_forLoopBIndexEnd
        if(Bn()) then
            if(bn()) then
                if(Nn()) then
                    call IncUnitAbilityLevel(o[(1+GetPlayerId(O[$C]))],'S005')
                    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("|c00ff8080"+GetHeroProperName(o[(1+GetPlayerId(GetTriggerPlayer()))]))+("|r이 |c00ff8080엘타스|r를 공격하였으나 살해하지 못했습니다. (보디가드)"+"")))
                else
                    if(An()) then
                        call IncUnitAbilityLevel(o[(1+GetPlayerId(O[6]))],'A01X')
                        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("|c00ff8080"+GetHeroProperName(o[(1+GetPlayerId(GetTriggerPlayer()))]))+("|r이 |c00ff8080라엘|r을 공격하였으나 살해하지 못했습니다. (보디가드)"+"")))
                    else
                        if(In()) then
                            call qr((1+GetPlayerId(GetTriggerPlayer())))
                        else
                            call Pr((1+GetPlayerId(GetTriggerPlayer())))
                        endif
                    endif
                endif
            else
                call qr((1+GetPlayerId(GetTriggerPlayer())))
            endif
            call TriggerExecute(yo)
return
        endif
        set bj_forLoopBIndex=bj_forLoopBIndex+1
    endloop
endfunction

function dn takes nothing returns boolean
    return(GetSpellAbilityId()=='A03B')
endfunction

function Dn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[4]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[4]))])=="프레이아")and(U=="리델루트 황야")
endfunction

function fn takes nothing returns boolean
    return(Rv[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])
endfunction

function Fn takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A002',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])>0)
endfunction

function gn takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A003',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])>0)or(GetUnitAbilityLevelSwapped('A01Z',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])>0)
endfunction

function Gn takes nothing returns boolean
    return(gn())
endfunction

function hn takes nothing returns nothing
    if(fn()) then
        set Rv[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=false
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080미명의 안개|r에 가려져 정확한 탐색이 불가능하다.")
        if(Dn()) then
            call DisplayTimedTextToPlayer(O[4],.8,0,8.,(("-|c00ff0000비공개|r: |c00ff8080"+(GetHeroProperName(GetTriggerUnit())+("|r가 "+H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])))+"를 |c00ff8080배틀 센스|r로 확인하려 했습니다!"))
        endif
        return
    endif
    if(Gn()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080상급 전사|r이다.")
    else
        if(Fn()) then
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080일반 전사|r이다.")
        else
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080전사|r가 아니다.")
        endif
    endif
endfunction

function jn takes nothing returns boolean
    return(GetClickedButton()==W[bj_forLoopAIndex])
endfunction

function Jn takes nothing returns nothing
    set bj_forLoopAIndex=1
    set bj_forLoopAIndexEnd=$C
    loop
        exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
        if(jn()) then
            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r:"+(b[bj_forLoopAIndex]+(("의 정체는 "+H[(1+GetPlayerId(O[bj_forLoopAIndex]))])+"입니다."))))
        endif
        set bj_forLoopAIndex=bj_forLoopAIndex+1
    endloop
endfunction

function Kn takes nothing returns boolean
    return(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H005')or(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H000')or(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H00O')or(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H00U')
endfunction

function ln takes nothing returns boolean
    return(Kn())and(SubStringBJ(GetEventPlayerChatString(),1,8)=="-전체 ")
endfunction

function Ln takes nothing returns boolean
    return(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetTriggerPlayer()))])>=35.)
endfunction

function mn takes nothing returns nothing
    if(Ln()) then
        call SetUnitManaBJ(o[(1+GetPlayerId(GetTriggerPlayer()))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetTriggerPlayer()))])-35.))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,(("|c00ff8080"+GetHeroProperName(o[(1+GetPlayerId(GetTriggerPlayer()))]))+("|r: "+SubStringBJ(GetEventPlayerChatString(),9,'d'))))
    else
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: 마나가 모자랍니다.")
    endif
endfunction

function pn takes nothing returns boolean
    return(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H00F')or(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H00L')or(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H018')or(GetUnitTypeId(o[(1+GetPlayerId(GetTriggerPlayer()))])=='H010')
endfunction

function Pn takes nothing returns boolean
    return(pn())and(SubStringBJ(GetEventPlayerChatString(),1,8)=="-전체 ")
endfunction

function qn takes nothing returns boolean
    return(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetTriggerPlayer()))])>=25.)
endfunction

function Qn takes nothing returns nothing
    if(qn()) then
        call SetUnitManaBJ(o[(1+GetPlayerId(GetTriggerPlayer()))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetTriggerPlayer()))])-25.))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,(("|c00ff8080"+"전체 채팅")+("|r: "+SubStringBJ(GetEventPlayerChatString(),9,'d'))))
    else
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: 마나가 모자랍니다.")
    endif
endfunction

function Sn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[1]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[1]))])=="라엘")and(GetUnitAbilityLevelSwapped('A01H',o[(1+GetPlayerId(O[1]))])>0)
endfunction

function tn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[7]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[7]))])=="엘타스")and(GetUnitAbilityLevelSwapped('A021',o[(1+GetPlayerId(O[7]))])>0)
endfunction

function Tn takes nothing returns nothing
    if(Sn()) then
        call UnitRemoveAbility(o[(1+GetPlayerId(O[1]))],'A01H')
        call UnitAddAbility(o[(1+GetPlayerId(O[1]))],'A02F')
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080상급 리더쉽|r 스킬을 획득하였습니다.")
    endif
    if(tn()) then
        call UnitRemoveAbility(o[(1+GetPlayerId(O[7]))],'A021')
        call UnitAddAbility(o[(1+GetPlayerId(O[7]))],'A02G')
        call DisplayTimedTextToPlayer(O[7],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080상급 리더쉽|r 스킬을 획득하였습니다.")
    endif
endfunction

function Un takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[3]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[3]))])=="카스파")
endfunction

function wn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[$C]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[$C]))])=="카스파")
endfunction

function Wn takes nothing returns nothing
    if(Un()) then
        call UnitAddAbility(o[(1+GetPlayerId(O[3]))],'A02K')
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080신탁|r 스킬을 획득하였습니다.")
    endif
    if(wn()) then
        call UnitAddAbility(o[(1+GetPlayerId(O[$C]))],'A018')
        call DisplayTimedTextToPlayer(O[$C],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080그림자의 눈|r 스킬을 획득하였습니다.")
    endif
endfunction

function Yn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[3]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[3]))])=="즈윈라")
endfunction

function zn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[4]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[4]))])=="프레이아")and(U=="왕자들의 내전")
endfunction

function Zn takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[1]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[1]))])=="치스")
endfunction

function vV takes nothing returns nothing
    if(Yn()) then
        call UnitAddAbility(o[(1+GetPlayerId(O[3]))],'A044')
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080족장 탐색|r 스킬을 획득하였습니다.")
    endif
    if(zn()) then
        call UnitAddAbility(o[(1+GetPlayerId(O[4]))],'A006')
        call DisplayTimedTextToPlayer(O[4],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080신탁|r 스킬을 획득하였습니다.")
    endif
    if(Zn()) then
        call UnitAddAbility(o[(1+GetPlayerId(O[1]))],'A03P')
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080정령의 주술|r 스킬을 획득하였습니다.")
    endif
endfunction

function xV takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[5]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[5]))])=="토크라")
endfunction

function oV takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[9]))]))and(GetHeroProperName(o[(1+GetPlayerId(O[9]))])=="킬데르")
endfunction

function rV takes nothing returns nothing
    if(xV()) then
        call UnitAddAbility(o[(1+GetPlayerId(O[5]))],'A02X')
        call DisplayTimedTextToPlayer(O[5],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080야생의 정기|r 스킬을 획득하였습니다.")
    endif
    if(oV()) then
        call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A00Q')
        call DisplayTimedTextToPlayer(O[9],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080카사노바|r 스킬을 획득하였습니다.")
    endif
endfunction

function aV takes nothing returns boolean
    return(GetSpellAbilityId()=='A019')
endfunction

function nV takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="투마")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="켈후")
endfunction

function VV takes nothing returns boolean
    return(nV())
endfunction

function EV takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카이")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="메르츠키엘")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="켈후")
endfunction

function XV takes nothing returns boolean
    return(EV())
endfunction

function OV takes nothing returns nothing
    if(VV()) then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"투마나 켈후의 이름을 공표한 사람에게 사용할 수 없습니다.")
return
    endif
    if(XV()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080상급 전사|r이다.")
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080상급 전사|r가 아니다.")
    endif
endfunction

function IV takes nothing returns boolean
    return(GetSpellAbilityId()=='A00A')
endfunction

function AV takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카이")
endfunction

function NV takes nothing returns nothing
    if(AV()) then
        call PlaySoundBJ(Jv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080단테스|r : 카이는"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"이다! 놈을 체포하라!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"의 정체는 카이였습니다.")))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"  ")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080카이|r가 처형당했습니다! |c00ff8080단테스|r측의 승리입니다.")
    else
        call PlaySoundBJ(Jv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080단테스|r : 카이는"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"이다! 놈을 체포하라!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"는 |c00ff8080카이|r가 아닙니다!")))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit()))))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"  ")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080카이|r : \"어리석군. 네놈의 운명도 여기까지다.\"\n- |c00ff8080카이|r가 |c00ff8080단테스|r를 살해하였습니다!")
    endif
endfunction

function BV takes nothing returns boolean
    return(GetSpellAbilityId()=='A00C')
endfunction

function cV takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="메르츠키엘")
endfunction

function CV takes nothing returns nothing
    if(cV()) then
        call PlaySoundBJ(kv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"|c00ff8080단테스|r가 |c00ff8080메르츠키엘|r을 후계자로 임명하였습니다!")
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff0000비공개|r: "+((H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"를 후계자로 설정하였습니다.")+"")))
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,("-|c00ff0000비공개|r: "+"|c00ff8080단테스|r가 당신을 후계자로 임명하였습니다!"))
        call UnitAddAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A00E')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"그 대상은 |c00ff8080메르츠키엘|r이 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A00C')
endfunction

function DV takes nothing returns boolean
    return(GetSpellAbilityId()=='A00H')
endfunction

function fV takes nothing returns nothing
    local unit u=GetSpellTargetUnit()
    call nr(.1)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("|c00ff8080메르츠키엘|r이  "+(H[(1+GetPlayerId(GetOwningPlayer((u))))]+"에게 쉐도우 자일을 시전하였습니다.")))
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],true)
    loop
        exitwhen UnitHasBuffBJ(u,'B001')!=true
        call nr(1.)
    endloop
    if UnitHasBuffBJ(u,'BNdo') then
    else
        call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],false)
    endif
endfunction

function gV takes nothing returns boolean
    return(GetSpellAbilityId()=='A01C')
endfunction

function GV takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="레인딜라")
endfunction

function hV takes nothing returns nothing
    if(GV()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080레인딜라|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A01C')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080레인딜라|r가 아닙니다.")
    endif
endfunction

function jV takes nothing returns boolean
    return(GetSpellAbilityId()=='A00L')
endfunction

function JV takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="단테스")
endfunction

function kV takes nothing returns nothing
    if(JV()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080단테스|r다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A00L')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080단테스|r가 아니다.")
    endif
endfunction

function lV takes nothing returns boolean
    return(GetSpellAbilityId()=='A006')
endfunction

function LV takes nothing returns nothing
    if UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I000') then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080합쳐진 진실의 보석|r을 가지고 있습니다! ")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I002') then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080진실의 조각 2/3|r을 가지고 있습니다! ")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I001') then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080진실의 조각 1/3|r을 가지고 있습니다! ")
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080진실의 보석|r을 가지고 있지 않습니다! ")
    endif
endfunction

function MV takes nothing returns boolean
    return(GetSpellAbilityId()=='A00M')
endfunction

function pV takes nothing returns boolean
    return(GetOwningPlayer(GetTriggerUnit())==GetOwningPlayer(GetSpellTargetUnit()))
endfunction

function PV takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A01D',GetTriggerUnit())==0)
endfunction

function qV takes nothing returns boolean
    return(IsPlayerAlly(GetOwningPlayer(GetSpellTargetUnit()),GetOwningPlayer(GetTriggerUnit())))
endfunction

function QV takes nothing returns nothing
    if(pV()) then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신에게 사용할 수 없습니다.")
    endif
    if(qV()) then
        call PlaySoundBJ(Lv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080소엔|r이  "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"를(을) 암살하였습니다!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-"+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+("은"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"입니다!")))))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.," ")
        if(PV()) then
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080연쇄살인|r스킬을 획득했습니다!")
            call UnitAddAbility(GetTriggerUnit(),'A01D')
        endif
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 당신에게 동맹설정을 하지 않았습니다.
        ")
    endif
endfunction

function SV takes nothing returns boolean
    return(GetSpellAbilityId()=='A02H')
endfunction

function tV takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="켈후")
endfunction

function TV takes nothing returns nothing
    if(tV()) then
        call PlaySoundBJ(wv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080소엔|r이 |c00ff8080켈후|r를 보좌하기 시작합니다."+""))
        call UnitAddAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A02I')
        call SetPlayerAllianceStateBJ(GetOwningPlayer(GetTriggerUnit()),O[3],2)
        call SetPlayerAllianceStateBJ(O[3],GetOwningPlayer(GetTriggerUnit()),2)
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,("-|c00ff8080소엔|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080켈후|r가 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A02H')
endfunction

function UV takes nothing returns boolean
    return(GetSpellAbilityId()=='A00O')
endfunction

function wV takes nothing returns nothing
    call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])-70.))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080세피|r가 누군가에게 버닝 매직을 시전하였습니다.")
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,15.,"-|c00ff0000비공개|r : 버닝 매직으로 인하여 마나가 |c00ff000070|r 감소하였습니다.")
endfunction

function yV takes nothing returns boolean
    return(GetSpellAbilityId()=='A00Y')
endfunction

function YV takes nothing returns nothing
    local unit u=GetSpellTargetUnit()
    call nr(.1)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("누군가가 "+(H[(1+GetPlayerId(GetOwningPlayer((u))))]+"에게 행동 불능 주문을 시전하였습니다.")))
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],true)
    loop
        exitwhen UnitHasBuffBJ(u,'BNdo')!=true
        call nr(1.)
    endloop
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],false)
endfunction

function ZV takes nothing returns boolean
    return(GetSpellAbilityId()=='A007')
endfunction

function vE takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="단테스")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="샤이닝")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카이")
endfunction

function eE takes nothing returns boolean
    return(vE())
endfunction

function xE takes nothing returns boolean
    return(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])<=50.)
endfunction

function oE takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="세피")
endfunction

function rE takes nothing returns nothing
    if(oE()) then
        if(xE()) then
            if(eE()) then
                call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 지휘관(|c00ff8080카이, 단테스, 샤이닝|r)이다.")
            else
                call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 이 사람은 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"이다!")))
            endif
        else
            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: 목표 대상의 마나가 50 이하가 아닙니다.")
        endif
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표해야 합니다.")
return
    endif
endfunction

function aE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00R')
endfunction

function nE takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="메르츠키엘")
endfunction

function VE takes nothing returns nothing
    if(nE()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080메르츠키엘|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A00R')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080메르츠키엘|r이 아닙니다.")
    endif
endfunction

function XE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00S')
endfunction

function OE takes nothing returns nothing
    local integer u=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    set K[(u)]=true
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff0000비공개|r: "+(H[(u)]+"에게 영혼의 회복을 시전합니다.")))
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080레인딜라|r가 당신에게 영혼의 회복을 시전합니다.\n-|c00ff0000비공개|r: 60초 동안 공격 실패시 페널티를 입지 않습니다.")
    call CreateTimerDialogBJ(CreateTimerBJ(false,60.),"영혼의 회복")
    call TimerDialogDisplayForPlayerBJ(false,bj_lastCreatedTimerDialog,GetLocalPlayer())
    call TimerDialogDisplayForPlayerBJ(true,bj_lastCreatedTimerDialog,GetOwningPlayer(GetSpellTargetUnit()))
    call nr(60.)
    set K[(u)]=false
    call DestroyTimerDialog(bj_lastCreatedTimerDialog)
endfunction

function IE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00F')
endfunction

function AE takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="레인딜라")
endfunction

function NE takes nothing returns nothing
    if(AE()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff0000비공개|r: |c00ff8080프레이아|r는 "+(H[(1+GetPlayerId(O[4]))]+"입니다!")))
        call UnitRemoveAbility(GetTriggerUnit(),'A00F')
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function BE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00U')
endfunction

function cE takes nothing returns nothing
    call PlaySoundBJ(mv)
    set k[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=true
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080레인딜라|r가 스스로를 희생하여 영혼의 벽을 시전하였습니다.\n- 누군가가 이 영혼의 벽의 보호를 받고 있습니다.")
    call Lr((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit()))))
endfunction

function dE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00B')
endfunction

function DE takes nothing returns boolean
    return(k[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])
endfunction

function fE takes nothing returns nothing
    if(DE()) then
        call PlaySoundBJ(pv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080카이|r가  "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 소울 리버를 시전합니다.")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-그러나 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"는 영혼의 벽으로 보호받고 있습니다!")))
    else
        call PlaySoundBJ(Mv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080카이|r가  "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 소울 리버를 시전하여 살해합니다!")))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+("의 정체는 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"입니다!")))))
    endif
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080카이|r의 정체가 20초 후 드러납니다.")
    call nr(20.)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080카이|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
endfunction

function gE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00V')
endfunction

function GE takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카이")
endfunction

function hE takes nothing returns nothing
    if(GE()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080카이|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A00V')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080카이|r가 아니다.")
    endif
endfunction

function jE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00P')
endfunction

function JE takes nothing returns nothing
    local unit u=GetSpellTargetUnit()
    call nr(.1)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("누군가가 "+(H[(1+GetPlayerId(GetOwningPlayer((u))))]+"에게 행동 불능 주문을 시전하였습니다.")))
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],true)
    loop
        exitwhen UnitHasBuffBJ(u,'BNdo')!=true
        call nr(1.)
    endloop
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],false)
endfunction

function KE takes nothing returns boolean
    return(GetSpellAbilityId()=='A00Z')
endfunction

function lE takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="켈후")and(GetUnitAbilityLevelSwapped('A02I',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])==0)
endfunction

function LE takes nothing returns nothing
    if(lE()) then
        call PlaySoundBJ(hv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080투마|r가 |c00ff8080켈후|r에게 돌진하여 쓰러뜨렸습니다."+""))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080켈후|r는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"입니다.")))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"            ")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080투마|r의 용맹함이 |c00ff8080카이|r의 귀에 전해집니다."+""))
        call SetPlayerAllianceStateBJ(O[8],O[$A],2)
        call SetPlayerAllianceStateBJ(O[$A],O[8],2)
        call DisplayTimedTextToPlayer(O[8],.8,0,8.,("-|c00ff8080투마|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
        call DisplayTimedTextToPlayer(O[$A],.8,0,8.,("-|c00ff8080카이|r의 정체는 "+(H[(1+GetPlayerId(O[8]))]+"입니다!")))
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080투마|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 돌진을 시도하였으나 실패하였습니다.")))
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080켈후|r가 아니거나, 냉정함 스킬을 가지고 있습니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A00Z')
endfunction

function ME takes nothing returns boolean
    return(UnitHasItemOfTypeBJ(GetTriggerUnit(),'I001'))or(UnitHasItemOfTypeBJ(GetTriggerUnit(),'I002'))or(UnitHasItemOfTypeBJ(GetTriggerUnit(),'I000'))
endfunction

function pE takes nothing returns boolean
    return(GetSpellAbilityId()=='A018')and(ME())
endfunction

function PE takes nothing returns nothing
    call RemoveItem(GetItemOfTypeFromUnitBJ(GetTriggerUnit(),'I000'))
    call RemoveItem(GetItemOfTypeFromUnitBJ(GetTriggerUnit(),'I002'))
    call RemoveItem(GetItemOfTypeFromUnitBJ(GetTriggerUnit(),'I001'))
    call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 이 사람은 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"이다!")))
    call nr(.2)
    call UnitRemoveAbility(GetTriggerUnit(),'A018')
endfunction

function QE takes nothing returns boolean
    return(GetSpellAbilityId()=='A02F')
endfunction

function sE takes nothing returns nothing
    call nr(.3)
    call DialogDisplayBJ(true,w[1],GetOwningPlayer(GetTriggerUnit()))
    call UnitRemoveAbility(GetTriggerUnit(),'A02F')
endfunction

function tE takes nothing returns boolean
    return(GetSpellAbilityId()=='A01H')
endfunction

function TE takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="라엘")
endfunction

function uE takes nothing returns nothing
    if(TE()) then
        call nr(.3)
        call DialogDisplayBJ(true,w[1],GetOwningPlayer(GetTriggerUnit()))
        call UnitRemoveAbility(GetTriggerUnit(),'A01H')
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function wE takes nothing returns boolean
    return(GetSpellAbilityId()=='A01I')
endfunction

function WE takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="에오릴")
endfunction

function yE takes nothing returns nothing
    if(WE()) then
        call PlaySoundBJ(kv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080라엘|r이 |c00ff8080에오릴|r의 시험을 통과하여 마스터가 되었습니다!")
        call UnitAddAbility(GetTriggerUnit(),'A01J')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080에오릴|r이 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A01I')
endfunction

function zE takes nothing returns boolean
    return(GetSpellAbilityId()=='A01J')
endfunction

function ZE takes nothing returns nothing
    call PlaySoundBJ(Pv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,((("-|c00ff8080"+GetHeroProperName(GetTriggerUnit()))+"|r이 마스터의 권능으로 ")+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"을 살해합니다!")))
    call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
    call UnitRemoveAbility(GetTriggerUnit(),'A01J')
endfunction

function eX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01G')
endfunction

function xX takes nothing returns nothing
    local integer a=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    call PlaySoundBJ(qv)
    if j[D[a]]>0 then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(1+GetPlayerId(GetTriggerPlayer()))]))+"|r가 울프스 슬러쉬를 시전하여 |c00ff8080"+GetHeroProperName(o[a])+"|r을(를) 공격합니다!"))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[a]))+"|r는 |c00ff8080"+I2S(j[D[a]])+"|r회 더 공격받으면 사망합니다."))
        set j[D[a]]=(j[D[a]]-1)
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(o[(1+GetPlayerId(GetTriggerPlayer()))]))+"|r가 울프스 슬러쉬를 시전하여 |c00ff8080"+GetHeroProperName(o[a])+"|r을(를) 살해합니다!"))
        call Lr(a)
    endif
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080케인|r은 "+(H[(1+GetPlayerId(GetTriggerPlayer()))]+"입니다!")))
    call UnitRemoveAbility(GetTriggerUnit(),'A01G')
endfunction

function rX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01K')
endfunction

function iX takes nothing returns nothing
    local unit u=GetSpellTargetUnit()
    call nr(.1)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("누군가가 "+(H[(1+GetPlayerId(GetOwningPlayer((u))))]+"에게 행동 불능 주문을 시전하였습니다.")))
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],true)
    loop
        exitwhen UnitHasBuffBJ(u,'BNdo')!=true
        call nr(1.)
    endloop
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],false)
endfunction

function nX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01N')
endfunction

function VX takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="라엘")
endfunction

function EX takes nothing returns nothing
    if(VX()) then
        call PlaySoundBJ(Qv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080에오릴|r이 |c00ff8080라엘|r에게 시련을 부여하였습니다.")
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,"-|c00ff0000비공개|r: 1분 후 |c00ff8080에오릴의 시험|r 스킬을 획득합니다.")
        call UnitRemoveAbility(GetTriggerUnit(),'A01N')
        call nr(60.)
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080에오릴의 시험|r 스킬을 획득하였습니다.")
        call UnitAddAbility(o[(1+GetPlayerId(O[1]))],'A01I')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080라엘|r이 아닙니다.")
        call UnitRemoveAbility(GetTriggerUnit(),'A01N')
    endif
endfunction

function OX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01O')
endfunction

function RX takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A01Y',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])>0)
endfunction

function IX takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="컨슘")
endfunction

function AX takes nothing returns nothing
    if(IX()) then
        if(RX()) then
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080에오릴|r이 |c00ff8080컨슘|r에게 피닉스의 불꽃을 시전하였으나 실패했습니다.\n-|c00ff8080컨슘|r은 |c00ff8080플레임 레지스턴스|r를 가지고 있습니다.")
        else
            call PlaySoundBJ(Pv)
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080에오릴|r이 "+("|c00ff8080컨슘|r"+"에게 피닉스의 불꽃을 시전하여 살해합니다.")))
            call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        endif
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080에오릴|r이 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 피닉스의 불꽃을 시전하였으나 실패했습니다.")))
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A01O')
endfunction

function bX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01Q')
endfunction

function BX takes nothing returns nothing
    call PlaySoundBJ(sv)
    call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+100.))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080뉴켈리어스|r가 차크라 매직을 시전합니다.\n- 이 마법에 영향을 받은 영웅의 마나가 |c00ff8080100|r 회복됩니다.\n- 60초 후 |c00ff8080뉴켈리어스|r의 정체가 드러납니다.")
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080뉴켈리어스|r가 당신에게 차크라 매직을 시전합니다.")
    call nr(60.)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080뉴켈리어스|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
endfunction

function CX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01R')
endfunction

function dX takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="쿠마린")
endfunction

function DX takes nothing returns nothing
    if(dX()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080쿠마린|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A01R')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080쿠마린|r이 아닙니다.")
    endif
endfunction

function FX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01U')
endfunction

function gX takes nothing returns nothing
    local unit u=GetSpellTargetUnit()
    call PlaySoundBJ(Sv)
    call UnitRemoveBuffsBJ(2,(u))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080타친|r이 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 중화의 주술을 시전하였습니다.")))
    call UnitRemoveAbility(GetTriggerUnit(),'A01U')
endfunction

function hX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01S')
endfunction

function HX takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="타친")
endfunction

function jX takes nothing returns nothing
    if(HX()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080타친|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A01S')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080타친|r이 아닙니다.")
    endif
endfunction

function kX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01V')
endfunction

function KX takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A01Y',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])>0)
endfunction

function lX takes nothing returns nothing
    if(KX()) then
        call UnitRemoveAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A01Y')
        call PlaySoundBJ(Sv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080쿠마린|r이 |c00ff8080컨슘|r에게 포박의 주술을 시전하였습니다.")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080컨슘|r의 레지스턴스 능력이 소멸했습니다.")
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080쿠마린|r이 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 포박의 주술을 시전하였으나 실패했습니다.")))
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A01V')
endfunction

function mX takes nothing returns boolean
    return(GetSpellAbilityId()=='A01W')
endfunction

function MX takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="라엘")
endfunction

function pX takes nothing returns nothing
    if(MX()) then
        call PlaySoundBJ(kv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080쿠마린|r이 |c00ff8080라엘|r을 보호하기 시작합니다!")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080라엘|r에게 향하는 2번의 공격을 방어합니다!")
        call UnitAddAbility(GetTriggerUnit(),'A01X')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080라엘|r이 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A01W')
endfunction

function qX takes nothing returns boolean
    return(GetSpellAbilityId()=='A02G')
endfunction

function QX takes nothing returns nothing
    call nr(.3)
    call DialogDisplayBJ(true,w[2],GetOwningPlayer(GetTriggerUnit()))
    call UnitRemoveAbility(GetTriggerUnit(),'A02G')
endfunction

function SX takes nothing returns boolean
    return(GetSpellAbilityId()=='A021')
endfunction

function tX takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="엘타스")
endfunction

function TX takes nothing returns nothing
    if(tX()) then
        call nr(.3)
        call DialogDisplayBJ(true,w[2],GetOwningPlayer(GetTriggerUnit()))
        call UnitRemoveAbility(GetTriggerUnit(),'A021')
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function UX takes nothing returns boolean
    return(GetSpellAbilityId()=='A00G')
endfunction

function wX takes nothing returns boolean
    return(GetOwningPlayer(GetTriggerUnit())==GetOwningPlayer(GetSpellTargetUnit()))
endfunction

function WX takes nothing returns nothing
    if(wX()) then
        call nr(.1)
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신에게 사용할 수 없습니다.")
    else
        call PlaySoundBJ(sv)
        call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+30.))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080사신트|r가 누군가를 지원하고 있습니다. ")
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"의 마나가 30 증가합니다."))
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"를 지원합니다."))
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,15.,"-비공개 : |c00ff8080사신트|r가 당신을 지원합니다.\n-비공개 : 당신의 마나가 |c00ff000030|r 증가합니다.")
    endif
endfunction

function YX takes nothing returns boolean
    return(GetSpellAbilityId()=='A00I')
endfunction

function zX takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="컨슘")
endfunction

function ZX takes nothing returns nothing
    if(zX()) then
        call PlaySoundBJ(tv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080사신트|r가 |c00ff8080컨슘|r을 훈련시키는 데 성공하였습니다.\n-|c00ff8080컨슘|r이 상급공격 스킬을 획득하였습니다.")
        call UnitAddAbility(o[(1+GetPlayerId(O[$C]))],'A003')
        call UnitRemoveAbility(o[(1+GetPlayerId(O[$C]))],'A002')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080컨슘|r이 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A00I')
endfunction

function eO takes nothing returns boolean
    return(GetSpellAbilityId()=='A02E')
endfunction

function xO takes nothing returns nothing
    call PlaySoundBJ(kv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080사신트|r가 배틀 마스터리를 익혔습니다!\n-상급 공격 스킬을 획득하였습니다.")
    call UnitRemoveAbility(GetTriggerUnit(),'A02E')
    call UnitRemoveAbility(GetTriggerUnit(),'A002')
    call UnitRemoveAbility(GetTriggerUnit(),'A00G')
    call UnitAddAbility(GetTriggerUnit(),'A003')
endfunction

function rO takes nothing returns boolean
    return(GetSpellAbilityId()=='A00N')
endfunction

function iO takes nothing returns nothing
    call PlaySoundBJ(Pv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,((("-|c00ff8080"+GetHeroProperName(GetTriggerUnit()))+"|r이 마스터의 권능으로 ")+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"을 살해합니다!")))
    call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
    call UnitRemoveAbility(GetTriggerUnit(),'A00N')
endfunction

function nO takes nothing returns boolean
    return(GetSpellAbilityId()=='A00Q')
endfunction

function VO takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="킬데르")
endfunction

function EO takes nothing returns boolean
    return(GetOwningPlayer(GetTriggerUnit())==GetOwningPlayer(GetSpellTargetUnit()))
endfunction

function XO takes nothing returns boolean
    return(A[(1+GetPlayerId(O[3]))]=="에오릴")
endfunction

function OO takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="에오릴")
endfunction

function RO takes nothing returns nothing
    if(VO()) then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"킬데르의 이름을 공표한 사람에게 사용할 수 없습니다.")
return
    endif
    if(EO()) then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신에게 사용할 수 없습니다.")
    endif
    if(XO()) then
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,("-|c00ff0000비공개|r: 뱀파이어의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
    endif
    if(OO()) then
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,("-|c00ff0000비공개|r: 뱀파이어가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게서 당신의 흔적을 찾고 있습니다.")))
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: 당신의 정체가 |c00ff8080킬데르|r에게 드러났습니다!")
        call nr(8.)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080에오릴|r입니다!")
    else
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,("-|c00ff0000비공개|r: 뱀파이어가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게서 당신의 흔적을 찾고 있습니다.")))
        call nr(8.)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080에오릴|r이 아닙니다.")
    endif
endfunction

function AO takes nothing returns boolean
    return(GetSpellAbilityId()=='A02D')
endfunction

function NO takes nothing returns nothing
    local unit u=GetSpellTargetUnit()
    call PlaySoundBJ(Jv)
    call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer((u))))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer((u))))])-50.))
    call nr(.1)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080드라칸|r이  "+(H[(1+GetPlayerId(GetOwningPlayer((u))))]+"에게 블랙 스펠을 시전하였습니다.")))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-"+(H[(1+GetPlayerId(GetOwningPlayer((u))))]+"의 마나가 |c00ff000050|r 감소하였습니다.")))
    call UnitRemoveAbility(GetTriggerUnit(),'A02D')
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],true)
    loop
        exitwhen UnitHasBuffBJ(u,'BNdo')!=true
        call nr(1.)
    endloop
    call PauseUnit(o[(1+GetPlayerId(GetOwningPlayer((u))))],false)
endfunction

function BO takes nothing returns boolean
    return(GetSpellAbilityId()=='A026')
endfunction

function cO takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="컨슘")
endfunction

function CO takes nothing returns nothing
    if(cO()) then
        call PlaySoundBJ(tv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080드라칸|r이 |c00ff8080컨슘|r에게 인챈트먼트 머슬을 시전합니다.\n-|c00ff8080컨슘|r이 아이언 스킨 스킬을 획득하였습니다.")
        call UnitAddAbility(o[(1+GetPlayerId(O[$C]))],'A028')
        set j[$C]=2
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080컨슘|r이 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A026')
endfunction

function DO takes nothing returns boolean
    return(GetSpellAbilityId()=='A02C')
endfunction

function fO takes nothing returns nothing
    local unit u=GetSpellTargetUnit()
    call PlaySoundBJ(uv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080허밀리|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 시잉 오브 리비도를 시전하였습니다.")))
    call nr(.1)
    call UnitRemoveAbility(GetTriggerUnit(),'A02C')
    call nr(30.)
    if UnitHasBuffBJ(u,'Bams') then
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 이 사람은 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer((u))))])+"이다!")))
    endif
endfunction

function gO takes nothing returns boolean
    return(GetSpellAbilityId()=='A024')
endfunction

function GO takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="컨슘")
endfunction

function hO takes nothing returns nothing
    if(GO()) then
        call PlaySoundBJ(tv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080허밀리|r가 |c00ff8080컨슘|r에게 리비도의 보호를 시전합니다.\n-|c00ff8080컨슘|r이 레지스턴스 스킬을 획득하였습니다.")
        call UnitAddAbility(o[(1+GetPlayerId(O[$C]))],'A01Y')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080컨슘|r이 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A024')
endfunction

function jO takes nothing returns boolean
    return(GetSpellAbilityId()=='A02B')
endfunction

function JO takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="엘타스")
endfunction

function kO takes nothing returns nothing
    if(JO()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080엘타스|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A02B')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080엘타스|r가 아니다.")
    endif
endfunction

function lO takes nothing returns boolean
    return(GetSpellAbilityId()=='A027')
endfunction

function LO takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="엘타스")
endfunction

function mO takes nothing returns nothing
    if(LO()) then
        call PlaySoundBJ(kv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080컨슘|r이 |c00ff8080엘타스|r를 보호하기 시작합니다!")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080엘타스|r에게 향하는 2번의 공격을 방어합니다!")
        call UnitAddAbility(GetTriggerUnit(),'S005')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080엘타스|r가 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A027')
endfunction

function pO takes nothing returns boolean
    return(GetSpellAbilityId()=='A029')
endfunction

function PO takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A01Y',GetTriggerUnit())!=0)and(GetUnitAbilityLevelSwapped('A028',GetTriggerUnit())!=0)and(GetUnitAbilityLevelSwapped('A003',GetTriggerUnit())!=0)
endfunction

function qO takes nothing returns nothing
    if(PO()) then
        call PlaySoundBJ(Tv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080컨슘|r이 최종 진화에 성공하였습니다!\n-학살의 시간이 다가왔습니다.")
        call UnitAddAbility(GetTriggerUnit(),'A02A')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 스킬을 모두 가지고 있지 않아 진화에 실패하였습니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A029')
endfunction

function sO takes nothing returns boolean
    return(GetSpellAbilityId()=='A02A')
endfunction

function SO takes nothing returns nothing
    call PlaySoundBJ(Uv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,((("-|c00ff8080"+GetHeroProperName(GetTriggerUnit()))+"|r이 학살을 시작합니다! ")+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"가 살해당했습니다.")))
    call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
endfunction

function TO takes nothing returns boolean
    return(GetSpellAbilityId()=='A02O')
endfunction

function uO takes nothing returns boolean
    return(Z==4)
endfunction

function UO takes nothing returns boolean
    return(GetHeroProperName(GetTriggerUnit())=="로네리스")
endfunction

function wO takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="유이")
endfunction

function WO takes nothing returns boolean
    return(vv[(1+GetPlayerId(O[9]))])
endfunction

function yO takes nothing returns boolean
    return(Z==4)
endfunction

function YO takes nothing returns boolean
    return(GetHeroProperName(GetTriggerUnit())=="로네리스")and(rv==2)
endfunction

function zO takes nothing returns nothing
    if(uO()) then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"더 이상 합류할 수 없습니다.")
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A02O')
return
    endif
    if(wO()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(GetTriggerUnit()))+"|r이 |c00ff8080유이|r와 합류에 성공했습니다."))
        set Z=(Z+1)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080유이|r의 전략 포인트가 1 증가하였습니다. // 현재 전략 포인트 : "+I2S(Z)))
        if(UO()) then
            set rv=(rv+1)
        endif
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A02O')
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(GetTriggerUnit()))+"|r이 합류에 실패했습니다!"))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,(("-|c00ff8080"+GetHeroProperName(GetTriggerUnit()))+("|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!"))))
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A02O')
    endif
    if(yO()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080유이|r의 전략 포인트가 4 가 되었습니다. 10초 후 |c00ff8080매스 텔레포트|r 스킬을 획득합니다.")
        call nr(10.)
        if(WO()) then
            call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A02V')
            call DisplayTimedTextToPlayer(O[9],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080상급 매스 텔레포트|r를 획득하였습니다.")
        else
            call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A031')
            call DisplayTimedTextToPlayer(O[9],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080매스 텔레포트|r를 획득하였습니다.")
        endif
    endif
    if(YO()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080로네리스|r가 |c00ff8080기사단의 심문|r 스킬을 획득했습니다.")
        call UnitAddAbility(GetTriggerUnit(),'A02W')
    endif
endfunction

function vR takes nothing returns boolean
    return(GetSpellAbilityId()=='A03A')
endfunction

function eR takes nothing returns boolean
    return(GetHeroProperName(GetTriggerUnit())=="로네리스")
endfunction

function xR takes nothing returns boolean
    return(GetHeroProperName(GetTriggerUnit())=="수프라")
endfunction

function oR takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A037',GetTriggerUnit())!=0)
endfunction

function rR takes nothing returns boolean
    return(GetHeroProperName(GetTriggerUnit())=="유이")
endfunction

function iR takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])==A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))])==A[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))])
endfunction

function aR takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="유이")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="로네리스")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="수프라")
endfunction

function nR takes nothing returns boolean
    return(iR())and(aR())
endfunction

function VR takes nothing returns nothing
    if(nR()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("확인에 성공했습니다. 이 사람은 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"입니다.")))
        call nr(.7)
        if(eR()) then
            call UnitAddAbility(GetTriggerUnit(),'A008')
        endif
        if(xR()) then
            call IncUnitAbilityLevel(GetTriggerUnit(),'S007')
            set j[$B]=(j[$B]+1)
        endif
        if(rR()) then
            if(oR()) then
                call UnitRemoveAbility(o[(1+GetPlayerId(O[9]))],'A037')
                call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A036')
            else
                call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A037')
            endif
        endif
        call UnitRemoveAbility(GetTriggerUnit(),'A03A')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"확인에 실패하였습니다.")
    endif
endfunction

function XR takes nothing returns boolean
    return(GetSpellAbilityId()=='A02Z')or(GetSpellAbilityId()=='A02Y')
endfunction

function OR takes nothing returns boolean
    return(XR())
endfunction

function RR takes nothing returns boolean
    return((GetUnitAbilityLevelSwapped('A02Z',o[(1+GetPlayerId(O[4]))])*GetUnitAbilityLevelSwapped('A02Y',o[(1+GetPlayerId(O[3]))]))==0)
endfunction

function IR takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]==GetHeroProperName(GetTriggerUnit()))
endfunction

function AR takes nothing returns nothing
    if(IR()) then
        if(RR()) then
            call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이미 상대방 측에서 종교 동맹의 서신을 보냈습니다.")
        else
            call nr(.7)
            call UnitRemoveAbility(GetTriggerUnit(),'A02Z')
            call UnitRemoveAbility(GetTriggerUnit(),'A02Y')
            call nr(60.)
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080프레이아|r와 |c00ff8080카스파|r 사이에 종교 동맹이 체결되었습니다!")
            call DisplayTimedTextToPlayer(O[3],.8,0,8.,("-|c00ff0000비공개|r: |c00ff8080프레이아|r는 "+(H[(1+GetPlayerId(O[4]))]+"입니다!")))
            call DisplayTimedTextToPlayer(O[4],.8,0,8.,("-|c00ff0000비공개|r: |c00ff8080카스파|r는 "+(H[(1+GetPlayerId(O[3]))]+"입니다!")))
        endif
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function bR takes nothing returns boolean
    return(GetSpellAbilityId()=='A02K')
endfunction

function BR takes nothing returns nothing
    if UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I000') then
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080합쳐진 진실의 보석|r을 가지고 있습니다! ")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I002') then
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080진실의 조각 2/3|r을 가지고 있습니다! ")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I001') then
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080진실의 조각 1/3|r을 가지고 있습니다! ")
    else
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080진실의 보석|r을 가지고 있지 않습니다! ")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A02K')
endfunction

function CR takes nothing returns boolean
    return(GetSpellAbilityId()=='A00J')
endfunction

function dR takes nothing returns nothing
    set Rv[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=true
endfunction

function fR takes nothing returns boolean
    return(GetSpellAbilityId()=='A035')
endfunction

function FR takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카미카제")
endfunction

function gR takes nothing returns nothing
    if(FR()) then
        call PlaySoundBJ(hv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080투마|r가 |c00ff8080카미카제|r에게 돌진하여 쓰러뜨렸습니다."+""))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080카미카제|r는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"입니다.")))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"            ")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080투마|r의 용맹함이 |c00ff8080카이|r의 귀에 전해집니다."+""))
        call UnitRemoveAbility(GetTriggerUnit(),'A003')
        call UnitAddAbility(GetTriggerUnit(),'A01Z')
        call SetPlayerAllianceStateBJ(O[1],GetOwningPlayer(GetTriggerUnit()),2)
        call SetPlayerAllianceStateBJ(GetOwningPlayer(GetTriggerUnit()),O[1],2)
        call DisplayTimedTextToPlayer(O[1],.8,0,8.,("-|c00ff8080투마|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff8080카이|r의 정체는 "+(H[(1+GetPlayerId(O[1]))]+"입니다!")))
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080투마|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 돌진을 시도하였으나 실패하였습니다.")))
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080켈후|r가 아니거나, 냉정함 스킬을 가지고 있습니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A035')
endfunction

function hR takes nothing returns boolean
    return(GetSpellAbilityId()=='A02M')
endfunction

function HR takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="투마")or(A[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]=="카미카제")
endfunction

function jR takes nothing returns boolean
    return(HR())
endfunction

function JR takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카미카제")
endfunction

function kR takes nothing returns nothing
    if(jR()) then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"투마나 카미카제의 이름을 공표한 사람에게 사용할 수 없습니다.")
return
    endif
    if(JR()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080카미카제|r이다!")
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080카미카제|r가 아니다.")
    endif
endfunction

function lR takes nothing returns boolean
    return(GetSpellAbilityId()=='A03L')
endfunction

function LR takes nothing returns nothing
    call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])-50.))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080세피|r가 누군가에게 버닝 매직을 시전하였습니다.")
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,15.,"-|c00ff0000비공개|r : 버닝 매직으로 인하여 마나가 |c00ff000050|r 감소하였습니다.")
endfunction

function MR takes nothing returns boolean
    return(GetSpellAbilityId()=='A030')
endfunction

function pR takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080세피|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 왜곡을 시전하였습니다.")))
    if UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I000') then
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"-|c00ff0000비공개|r: 왜곡에 성공하여 대상 영웅의 |c00ff8080진실의 보석|r 등급을 하락시켰습니다.")
        call RemoveItem(GetItemOfTypeFromUnitBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I000'))
        call UnitAddItemByIdSwapped('I002',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I002') then
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"-|c00ff0000비공개|r: 왜곡에 성공하여 대상 영웅의 |c00ff8080진실의 보석|r 등급을 하락시켰습니다.")
        call RemoveItem(GetItemOfTypeFromUnitBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I002'))
        call UnitAddItemByIdSwapped('I001',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I001') then
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"-|c00ff0000비공개|r: 왜곡에 성공하여 대상 영웅의 |c00ff8080진실의 보석|r 등급을 하락시켰습니다.")
        call RemoveItem(GetItemOfTypeFromUnitBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I001'))
    else
        call DisplayTimedTextToPlayer(O[6],.8,0,8.,"-|c00ff0000비공개|r: 대상 영웅은 |c00ff8080진실의 보석|r을 가지고 있지 않습니다! ")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A030')
endfunction

function qR takes nothing returns boolean
    return(GetSpellAbilityId()=='A03M')
endfunction

function QR takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="단테스")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="샤이닝")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카이")
endfunction

function sR takes nothing returns boolean
    return(QR())
endfunction

function SR takes nothing returns boolean
    return(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])<=50.)
endfunction

function tR takes nothing returns nothing
    if(SR()) then
        if(sR()) then
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 지휘관(|c00ff8080카이, 샤이닝|r)이다.")
        else
            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 이 사람은 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"이다!")))
        endif
    else
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: 목표 대상의 마나가 50 이하가 아닙니다.")
    endif
endfunction

function uR takes nothing returns boolean
    return(GetSpellAbilityId()=='A02P')
endfunction

function UR takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="치즈코")
endfunction

function wR takes nothing returns nothing
    if(UR()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080치즈코|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A02P')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080치즈코|r가 아닙니다.")
    endif
endfunction

function yR takes nothing returns boolean
    return(GetSpellAbilityId()=='A02N')
endfunction

function YR takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카이")
endfunction

function zR takes nothing returns nothing
    if(YR()) then
        call PlaySoundBJ(Jv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080샤이닝|r : 카이는"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"이다! 지상의 수호자들이여, 그를 처단하라!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"의 정체는 카이였습니다.")))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"  ")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080카이|r가 사망했습니다! |c00ff8080가디언|r측의 승리입니다.")
    else
        call PlaySoundBJ(Jv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080샤이닝|r : 카이는"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"이다! 지상의 수호자들이여, 그를 처단하라!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"는 |c00ff8080카이|r가 아닙니다!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080샤이닝|r의 정체가 20초 후 드러납니다.")
        call UnitRemoveAbility(GetTriggerUnit(),'A02N')
        call nr(3.)
        call TriggerExecute(yo)
        call nr(17.)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080샤이닝|r의 정체는 "+(H[(1+GetPlayerId(O[7]))]+"입니다!")))
    endif
endfunction

function vI takes nothing returns boolean
    return(GetSpellAbilityId()=='A02S')
endfunction

function eI takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="샤이닝")
endfunction

function xI takes nothing returns nothing
    if(eI()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080샤이닝|r입니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A02S')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080샤이닝|r이 아닙니다.")
    endif
endfunction

function rI takes nothing returns boolean
    return(GetSpellAbilityId()=='A02T')
endfunction

function iI takes nothing returns nothing
    local integer u=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080치즈코|r가 누군가와 외교를 하고 있습니다.")
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080치즈코|r가 당신에게 외교를 사용했습니다.")
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,("-|c00ff8080치즈코|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
    call UnitRemoveAbility(GetTriggerUnit(),'A02T')
    call nr(15.)
    call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 외교에 성공했습니다. 이 사람은 |c00ff0000"+(GetHeroProperName(o[(u)])+"|r입니다.")))
endfunction

function nI takes nothing returns boolean
    return(GetSpellAbilityId()=='A02R')
endfunction

function VI takes nothing returns nothing
    set ov=GetOwningPlayer(GetSpellTargetUnit())
    call DialogDisplayBJ(true,ev,GetTriggerPlayer())
endfunction

function XI takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A037',o[(1+GetPlayerId(ov))])!=0)
endfunction

function OI takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A031',o[(1+GetPlayerId(ov))])!=0)
endfunction

function RI takes nothing returns boolean
    return(GetClickedButton()==xv[bj_forLoopAIndex])and(ov==O[bj_forLoopAIndex])and(IsUnitAliveBJ(o[(1+GetPlayerId(ov))]))
endfunction

function II takes nothing returns nothing
    set bj_forLoopAIndex=9
    set bj_forLoopAIndexEnd=$B
    loop
        exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
        if(RI()) then
            call PlaySoundBJ(yv)
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080치즈코|r가 |c00ff8080"+(GetHeroProperName(o[(1+GetPlayerId(ov))])+"|r에게 천사의 세례를 사용했습니다!")))
            set vv[(1+GetPlayerId(ov))]=true
            if bj_forLoopAIndex==9 then
                if(XI()) then
                    call UnitRemoveAbility(o[(1+GetPlayerId(O[9]))],'A037')
                    call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A036')
                else
                    call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A037')
                endif
                if(OI()) then
                    call UnitRemoveAbility(o[(1+GetPlayerId(O[9]))],'A031')
                    call UnitAddAbility(o[(1+GetPlayerId(O[9]))],'A02V')
                endif
                return
            elseif bj_forLoopAIndex==$A then
                call UnitAddAbility(o[(1+GetPlayerId(ov))],'A032')
return
            elseif bj_forLoopAIndex==$B then
                call SetUnitAbilityLevelSwapped('S007',o[(1+GetPlayerId(ov))],(GetUnitAbilityLevelSwapped('S007',o[(1+GetPlayerId(ov))])+2))
                set j[$B]=(j[$B]+2)
return
            endif
        endif
        set bj_forLoopAIndex=bj_forLoopAIndex+1
    endloop
    call UnitRemoveAbility(o[(1+GetPlayerId(GetTriggerPlayer()))],'A02R')
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080치즈코|r가 천사의 세례에 실패하였습니다.")
endfunction

function NI takes nothing returns boolean
    return(GetSpellAbilityId()=='A031')
endfunction

function bI takes nothing returns nothing
    call PlaySoundBJ(Wv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080유이|r가 매스 텔레포트를 시전하여 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"를 살해합니다!")))
    call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080유이|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+"입니다!")))
    call UnitRemoveAbility(GetTriggerUnit(),'A031')
endfunction

function cI takes nothing returns boolean
    return(GetSpellAbilityId()=='A02V')
endfunction

function CI takes nothing returns nothing
    call PlaySoundBJ(Wv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080유이|r가 상급 매스 텔레포트를 시전하여 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"를 살해합니다!")))
    call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
    call UnitRemoveAbility(GetTriggerUnit(),'A02V')
endfunction

function DI takes nothing returns boolean
    return(GetSpellAbilityId()=='A032')
endfunction

function fI takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A002',GetTriggerUnit())!=0)
endfunction

function FI takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카스파")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="프레이아")
endfunction

function gI takes nothing returns boolean
    return(FI())
endfunction

function GI takes nothing returns nothing
    local integer u=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    if(gI()) then
        if(fI()) then
            call UnitRemoveAbility(GetTriggerUnit(),'A002')
            call UnitAddAbility(GetTriggerUnit(),'A003')
        endif
        call nr(.1)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080로네리스|r가 이단 심판을 사용하여 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"를 살해합니다!")))
        call PlaySoundBJ(Jv)
        call Lr(u)
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff8080비공개|r : 이단 심판에 실패했습니다.")
    endif
endfunction

function HI takes nothing returns boolean
    return(GetSpellAbilityId()=='A02W')
endfunction

function jI takes nothing returns nothing
    local integer u=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    call PlaySoundBJ(lv)
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080로네리스|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 기사단의 심문을 사용했습니다!")))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"의 정체가 150초 후 로네리스에게 드러납니다!")))
    call UnitRemoveAbility(GetTriggerUnit(),'A02W')
    call nr(60.)
    call DisplayTimedTextToPlayer(O[$A],.8,0,8.,("-|c00ff0000비공개|r: 이 사람은 "+(GetHeroProperName(o[(u)])+"이다!")))
endfunction

function kI takes nothing returns boolean
    return(GetSpellAbilityId()=='A038')
endfunction

function KI takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="수프라")
endfunction

function lI takes nothing returns boolean
    return(rv==2)
endfunction

function LI takes nothing returns nothing
    if(KI()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080로네리스|r가 기사단 창설에 성공했습니다.")
        set rv=(rv+1)
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080로네리스|r가 기사단 창설에 실패했습니다.")
    endif
    if(lI()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080로네리스|r가 |c00ff8080기사단의 심문|r 스킬을 획득했습니다.")
        call PlaySoundBJ(sv)
        call UnitAddAbility(GetTriggerUnit(),'A02W')
    endif
    call nr(.7)
    call UnitRemoveAbility(GetTriggerUnit(),'A038')
endfunction

function MI takes nothing returns boolean
    return(GetSpellAbilityId()=='A034')
endfunction

function pI takes nothing returns nothing
    if UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I000') then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: 더 이상 등급을 상승시킬 수 없습니다.")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I002') then
        call RemoveItem(GetItemOfTypeFromUnitBJ(GetTriggerUnit(),'I002'))
        call UnitAddItemByIdSwapped('I000',GetTriggerUnit())
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080카미카제|r가 고대의 주술을 사용하여 소유한 |c00ff8080진실의 보석|r의 등급을 한 단계 올렸습니다!")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I001') then
        call RemoveItem(GetItemOfTypeFromUnitBJ(GetTriggerUnit(),'I001'))
        call UnitAddItemByIdSwapped('I002',GetTriggerUnit())
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080카미카제|r가 고대의 주술을 사용하여 소유한 |c00ff8080진실의 보석|r의 등급을 한 단계 올렸습니다!")
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080진실의 보석|r이 없으면 사용할 수 없습니다.")
    endif
endfunction

function qI takes nothing returns boolean
    return(GetSpellAbilityId()=='A03N')
endfunction

function QI takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="샤이닝")
endfunction

function sI takes nothing returns nothing
    if(QI()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080샤이닝|r입니다!\n-|c00ff0000아군 확인|r 스킬을 획득하였습니다!")
        call nr(.2)
        call UnitRemoveAbility(GetTriggerUnit(),'A03N')
        call UnitAddAbility(GetTriggerUnit(),'A02J')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080샤이닝|r이 아닙니다.")
    endif
endfunction

function tI takes nothing returns boolean
    return(GetSpellAbilityId()=='A03J')
endfunction

function TI takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A043',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])>0)
endfunction

function uI takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="데카")
endfunction

function UI takes nothing returns nothing
    if(uI()) then
        call PlaySoundBJ(yv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080치스|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 홀리 바인딩을 시전합니다!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080데카|r는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"였습니다!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"  ")
        if(TI()) then
            call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])-80.))
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080데카|r의 마나가 80 감소합니다!")
        else
            call UnitRemoveAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A03K')
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080데카|r의 블러디 매드니스가 정화되어 사라졌습니다!")
        endif
    else
        call PlaySoundBJ(yv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff8080치스|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 홀리 바인딩을 시전합니다!")))
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"는 |c00ff8080데카|r가 아닙니다!")))
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A03J')
endfunction

function WI takes nothing returns boolean
    return(GetSpellAbilityId()=='A03P')
endfunction

function yI takes nothing returns boolean
    return(IsPlayerInForce(GetOwningPlayer(GetSpellTargetUnit()),B[2]))and(UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I001')!=true)and(UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I002')!=true)and(UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I000')!=true)
endfunction

function YI takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="치스")
endfunction

function zI takes nothing returns nothing
    if(YI()) then
        call PlaySoundBJ(tv)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,"-|c00ff0000비공개|r: 치스가 당신에게 정령의 주술을 사용하였습니다!")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080치스|r가 누군가에게 정령의 주술을 시전하였습니다.")
        if(yI()) then
            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 주술이 성공하였습니다. 이 사람은 "+(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+"입니다.")))
        else
            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: 정령의 주술이 실패했습니다.")
        endif
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function vA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03C')or(GetSpellAbilityId()=='A03D')
endfunction

function eA takes nothing returns boolean
    return(vA())
endfunction

function xA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03C')and(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="즈윈라")
endfunction

function oA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03D')and(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="사토시")
endfunction

function rA takes nothing returns boolean
    return(xA())or(oA())
endfunction

function iA takes nothing returns boolean
    return(rA())
endfunction

function aA takes nothing returns nothing
    if(iA()) then
        call DisplayTimedTextToPlayer(O[2],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080즈윈라|r와 당신이 동맹이 되었습니다!")
        call DisplayTimedTextToPlayer(O[3],.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080사토시|r와 당신이 동맹이 되었습니다!")
        call SetPlayerAllianceStateBJ(O[2],O[3],2)
        call SetPlayerAllianceStateBJ(O[3],O[2],2)
        call nr(.01)
        call UnitRemoveAbility(o[(1+GetPlayerId(O[2]))],'A03C')
        call UnitRemoveAbility(o[(1+GetPlayerId(O[3]))],'A03D')
        call UnitAddAbility(o[(1+GetPlayerId(O[2]))],'A009')
        call UnitAddAbility(o[(1+GetPlayerId(O[3]))],'A009')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080즈윈라|r가 아닙니다.")
    endif
endfunction

function VA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03F')
endfunction

function EA takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="치스")
endfunction

function XA takes nothing returns nothing
    if(EA()) then
        call PlaySoundBJ(kv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080사토시|r가 |c00ff8080치스|r를 보호하기 시작합니다!")
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-|c00ff8080치스|r에게 향하는 무모한 돌진을 방어합니다!")
        set Xv=true
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080치스|r가 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A03F')
endfunction

function RA takes nothing returns boolean
    return(GetSpellAbilityId()=='A044')
endfunction

function IA takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]==GetHeroProperName(GetTriggerUnit()))
endfunction

function AA takes nothing returns nothing
    if(IA()) then
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A044')
        call nr(60.)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff0000비공개|r: |c00ff8080치스|r는 "+(H[(1+GetPlayerId(O[1]))]+"입니다!")))
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function bA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03G')
endfunction

function BA takes nothing returns nothing
    call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])-30.))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080하치|r가 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 트롤 부족의 맹독을 시전하였습니다.")))
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-"+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"의 마나가 |c00ff000030|r 감소하였습니다.")))
endfunction

function CA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03I')
endfunction

function dA takes nothing returns nothing
    if UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I000') then
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: 더 이상 등급을 상승시킬 수 없습니다.")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I002') then
        call RemoveItem(GetItemOfTypeFromUnitBJ(GetTriggerUnit(),'I002'))
        call UnitAddItemByIdSwapped('I000',GetTriggerUnit())
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080하치|r가 고대의 주술을 사용하여 소유한 |c00ff8080진실의 보석|r의 등급을 한 단계 올렸습니다!")
    elseif UnitHasItemOfTypeBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'I001') then
        call RemoveItem(GetItemOfTypeFromUnitBJ(GetTriggerUnit(),'I001'))
        call UnitAddItemByIdSwapped('I002',GetTriggerUnit())
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080하치|r가 고대의 주술을 사용하여 소유한 |c00ff8080진실의 보석|r의 등급을 한 단계 올렸습니다!")
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,"-|c00ff0000비공개|r: |c00ff8080진실의 보석|r이 없으면 사용할 수 없습니다.")
    endif
endfunction

function fA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03U')
endfunction

function FA takes nothing returns nothing
    set f[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    call DialogDisplayBJ(true,Vv,GetOwningPlayer(GetTriggerUnit()))
    call nr(6.)
    call DialogDisplayBJ(false,Vv,GetOwningPlayer(GetTriggerUnit()))
endfunction

function GA takes nothing returns boolean
    return(b[D[f[(1+GetPlayerId(GetTriggerPlayer()))]]]==b[bj_forLoopBIndex])
endfunction

function hA takes nothing returns boolean
    return(GetClickedButton()==Ev[bj_forLoopBIndex])
endfunction

function HA takes nothing returns nothing
    set bj_forLoopBIndex=1
    set bj_forLoopBIndexEnd=$C
    loop
        exitwhen bj_forLoopBIndex>bj_forLoopBIndexEnd
        if(hA()) then
            if(GA()) then
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff0000사냥꾼의 표식|r이 새겨져 "+(H[f[(1+GetPlayerId(GetTriggerPlayer()))]]+("의 정체가 공개되었습니다! 그는 "+(GetHeroProperName(o[f[(1+GetPlayerId(GetTriggerPlayer()))]])+"였습니다!")))))
            else
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,("-|c00ff0000사냥꾼의 표식|r이 실패하여 하치의 정체가 드러납니다! 하치의 정체는 "+(H[(1+GetPlayerId(GetTriggerPlayer()))]+"였습니다!")))
            endif
            return
        endif
        set bj_forLoopBIndex=bj_forLoopBIndex+1
    endloop
endfunction

function JA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03O')
endfunction

function kA takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]==GetHeroProperName(GetTriggerUnit()))
endfunction

function KA takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]==GetHeroProperName(GetTriggerUnit()))
endfunction

function lA takes nothing returns nothing
    if(KA()) then
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A03O')
        call nr(20.)
        if(kA()) then
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff0000비공개|r: |c00ff8080치스|r는 "+(H[(1+GetPlayerId(O[1]))]+"입니다!")))
        else
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있지 않아 스킬이 실패했습니다.")
        endif
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function mA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03O')
endfunction

function MA takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]==GetHeroProperName(GetTriggerUnit()))
endfunction

function pA takes nothing returns boolean
    return(A[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]==GetHeroProperName(GetTriggerUnit()))
endfunction

function PA takes nothing returns nothing
    if(pA()) then
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A03O')
        call nr(20.)
        if(MA()) then
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff0000비공개|r: |c00ff8080치스|r는 "+(H[(1+GetPlayerId(O[1]))]+"입니다!")))
        else
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있지 않아 스킬이 실패했습니다.")
        endif
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function QA takes nothing returns boolean
    return(GetSpellAbilityId()=='A03Q')
endfunction

function sA takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카'눌라")or(Ov==(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
endfunction

function SA takes nothing returns boolean
    return(sA())
endfunction

function tA takes nothing returns nothing
    if(SA()) then
        call PlaySoundBJ(Yv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080울피안|r이 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 정화의 주술을 시전하여 혼돈의 힘을 정화합니다!")))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
    else
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,("-|c00ff8080울피안|r이 "+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 정화의 주술을 시전하였으나 실패했습니다.")))
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A03Q')
endfunction

function uA takes nothing returns boolean
    return(GetSpellAbilityId()=='A02U')
endfunction

function UA takes nothing returns boolean
    return(GetOwningPlayer(GetTriggerUnit())==GetOwningPlayer(GetSpellTargetUnit()))
endfunction

function wA takes nothing returns nothing
    if(UA()) then
        call nr(.1)
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신에게 사용할 수 없습니다.")
    else
        call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+30.))
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"의 마나가 30 증가합니다."))
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"를 지원합니다."))
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,15.,"-비공개 : 누군가가 당신을 지원합니다.\n-비공개 : 당신의 마나가 |c00ff000030|r 증가합니다.")
    endif
endfunction

function yA takes nothing returns boolean
    return(GetSpellAbilityId()=='A02X')
endfunction

function YA takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="울디안")or(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="울피안")
endfunction

function zA takes nothing returns boolean
    return(YA())
endfunction

function ZA takes nothing returns nothing
    if(zA()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람에게서 |c00ff8080야생의 기운|r이 느껴집니다!\n-10초 후 |c00ff8080야생의 축복|r 스킬을 획득합니다!")
        call UnitRemoveAbility(GetTriggerUnit(),'A02X')
        call nr(10.)
        call UnitAddAbility(GetTriggerUnit(),'A042')
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람에게서는 야생의 기운이 느껴지지 않습니다.")
    endif
endfunction

function eN takes nothing returns boolean
    return(GetSpellAbilityId()=='A042')
endfunction

function xN takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="울피안")
endfunction

function oN takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="울디안")
endfunction

function rN takes nothing returns nothing
    if(oN()) then
        call PlaySoundBJ(kv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080토크라|r가 누군가에게 야생의 축복을 시전하였습니다!")
        call UnitRemoveAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A002')
        call UnitAddAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A003')
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,"-|c00ff0000비공개|r: 야생의 축복을 받아 |c00ff0000상급 공격|r 스킬을 획득하였습니다!")
    else
        if(xN()) then
            call PlaySoundBJ(kv)
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080토크라|r가 누군가에게 야생의 축복을 시전하였습니다!")
            call UnitAddAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A03B')
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,8.,"-|c00ff0000비공개|r: 야생의 축복을 받아 |c00ff0000배틀 센스|r 스킬을 획득하였습니다!")
        else
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-|c00ff8080토크라|r가 야생의 축복에 실패하였습니다!")
            call UnitRemoveAbility(GetTriggerUnit(),'A042')
        endif
    endif
endfunction

function aN takes nothing returns boolean
    return(GetSpellAbilityId()=='A03E')
endfunction

function nN takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="카'눌라")
endfunction

function VN takes nothing returns nothing
    if(nN()) then
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람의 정체는 |c00ff8080카'눌라|r입니다!")
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 이 사람은 |c00ff8080카'눌라|r가 아닙니다.")
    endif
endfunction

function XN takes nothing returns boolean
    return(GetSpellAbilityId()=='A03X')
endfunction

function ON takes nothing returns boolean
    return(GetOwningPlayer(GetTriggerUnit())==GetOwningPlayer(GetSpellTargetUnit()))
endfunction

function RN takes nothing returns nothing
    if(ON()) then
        call nr(.1)
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신에게 사용할 수 없습니다.")
    else
        call SetUnitManaBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],(GetUnitStateSwap(UNIT_STATE_MANA,o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])+30.))
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"의 마나가 30 증가합니다."))
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"를 지원합니다."))
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetSpellTargetUnit()),.8,0,15.,"-비공개 : 누군가가 당신을 지원합니다.\n-비공개 : 당신의 마나가 |c00ff000030|r 증가합니다.")
    endif
endfunction

function AN takes nothing returns boolean
    return(GetSpellAbilityId()=='A03Y')
endfunction

function NN takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A03K',o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])>0)
endfunction

function bN takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="데카")
endfunction

function BN takes nothing returns nothing
    if(bN()) then
        call PlaySoundBJ(mv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080카'눌라|r가 스스로를 희생하여 금단의 주술을 시전하였습니다!")
        if(NN()) then
            call SetUnitManaPercentBJ(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'d')
            call UnitAddAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A043')
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080데카|r가 광폭화 스킬을 획득하고 모든 마나를 회복하였습니다!")
        else
            call UnitAddAbility(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))],'A03K')
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080데카|r가 블러드 매드니스를 다시 획득하였습니다!")
        endif
        call Lr((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit()))))
    else
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 그 대상은 |c00ff8080데카|r가 아닙니다.")
    endif
    call UnitRemoveAbility(GetTriggerUnit(),'A03Y')
endfunction

function CN takes nothing returns boolean
    return(GetSpellAbilityId()=='A03V')
endfunction

function dN takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="카'눌라")
endfunction

function DN takes nothing returns nothing
    local integer u=(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))
    if(dN()) then
        call nr(60.)
        if IsPlayerInForce(Player(-1+(u)),B[2]) then
            call PlaySoundBJ(Qv)
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"- |c00ff8080카'눌라|r가 혼돈의 주술을 사용해 누군가의 정체를 알아내었습니다!")
            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,8.,("-|c00ff0000비공개|r: 대상의 정체는 "+(GetHeroProperName(o[(u)])+"입니다!")))
            set Ov=(u)
        else
            call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-|c00ff0000비공개|r: 혼돈의 주술이 실패한 모양입니다.")
        endif
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function FN takes nothing returns boolean
    return(GetSpellAbilityId()=='A03R')
endfunction

function gN takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="카즈로우")
endfunction

function GN takes nothing returns nothing
    if(gN()) then
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A03R')
        call UnitResetCooldown(GetTriggerUnit())
        call PlaySoundBJ(zv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-누군가가 |c00ff8080광폭화|r 스킬을 사용하였습니다! ")
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function HN takes nothing returns boolean
    return(GetSpellAbilityId()=='A03Z')
endfunction

function jN takes nothing returns boolean
    return(GetHeroProperName(o[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))])=="치스")and(IsUnitAliveBJ(o[(1+GetPlayerId(O[2]))]))and(Xv)
endfunction

function JN takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,((("-|c00ff8080"+GetHeroProperName(GetTriggerUnit()))+"|r가  ")+(H[(1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit())))]+"에게 무모한 돌진을 시전하였습니다!")))
    if(jN()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,8.,"-하지만 |c00ff8080무모한 돌진|r은 |c00ff8080사토시|r에 의해 가로막혔습니다!")
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"-당신의 돌격은 |c00ff8080사토시|r에 의해 가로막혔습니다!")
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,("-|c00ff8080사토시|r의 정체는 "+(H[(1+GetPlayerId(O[2]))]+" 입니다!")))
        call DisplayTimedTextToPlayer(O[2],.8,0,8.,"-당신은 |c00ff8080그즐리카 돌격대|r의 돌격으로부터 치스를 보호했습니다!")
        call DisplayTimedTextToPlayer(O[2],.8,0,8.,("-|c00ff8080돌격한 자|r의 정체는 "+(H[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+" 입니다!")))
        call UnitRemoveAbility(GetTriggerUnit(),'A03Z')
return
    else
        call Lr((1+GetPlayerId(GetOwningPlayer(GetSpellTargetUnit()))))
        call Lr((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit()))))
    endif
endfunction

function KN takes nothing returns boolean
    return(GetSpellAbilityId()=='A03S')
endfunction

function lN takes nothing returns boolean
    return(A[(1+GetPlayerId(GetTriggerPlayer()))]=="세이로우")
endfunction

function LN takes nothing returns nothing
    if(lN()) then
        call nr(.7)
        call UnitRemoveAbility(GetTriggerUnit(),'A03S')
        call UnitRemoveAbility(GetTriggerUnit(),'A02J')
        call UnitAddAbility(GetTriggerUnit(),'A003')
        call UnitAddAbility(GetTriggerUnit(),'S009')
        set j[$C]=1
        call nr(20.)
        call PlaySoundBJ(zv)
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,15.,"-누군가가 |c00ff8080광폭화|r 스킬을 사용하였습니다! ")
    else
        call IssueImmediateOrderById(GetTriggerUnit(),$D0004)
        call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,8.,"자신의 진명을 공표하고 있어야 합니다.")
    endif
endfunction

function MN takes nothing returns boolean
    return(GetSpellAbilityId()=='A01E')
endfunction

function pN takes nothing returns nothing
    local integer mr=1
    loop
        exitwhen mr>$C
        if IsUnitDeadBJ(o[mr]) then
            call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,30.,(H[(mr)]+(" : "+GetHeroProperName(o[(mr)]))))
        endif
        set mr=mr+1
    endloop
endfunction

function qN takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,3)=="-1 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-2 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-3 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-4 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-5 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-6 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-7 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-8 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-9 ")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-10")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-11")or(SubStringBJ(GetEventPlayerChatString(),1,3)=="-12")
endfunction

function QN takes nothing returns boolean
    return(qN())
endfunction

function sN takes nothing returns nothing
    call DisplayTimedTextToPlayer(Player(-1+(S2I(SubStringBJ(GetEventPlayerChatString(),2,3)))),.8,0,8.,((H[(1+GetPlayerId(GetTriggerPlayer()))]+"의 귓속말 : ")+SubStringBJ(GetEventPlayerChatString(),4,$96)))
endfunction

function tN takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,1)=="!")and(SubStringBJ(GetEventPlayerChatString(),2,2)!=" ")
endfunction

function TN takes nothing returns nothing
    set l[(1+GetPlayerId(GetTriggerPlayer()))]=SubStringBJ(GetEventPlayerChatString(),2,'d')
endfunction

function UN takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,1)=="@")and(SubStringBJ(GetEventPlayerChatString(),2,2)!=" ")
endfunction

function wN takes nothing returns nothing
    set m[(1+GetPlayerId(GetTriggerPlayer()))]=SubStringBJ(GetEventPlayerChatString(),2,'d')
endfunction

function yN takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,1)=="#")and(SubStringBJ(GetEventPlayerChatString(),2,2)!=" ")
endfunction

function YN takes nothing returns nothing
    set M[(1+GetPlayerId(GetTriggerPlayer()))]=SubStringBJ(GetEventPlayerChatString(),2,'d')
endfunction

function ZN takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,1)=="$")and(SubStringBJ(GetEventPlayerChatString(),2,2)!=" ")
endfunction

function vb takes nothing returns nothing
    set L[(1+GetPlayerId(GetTriggerPlayer()))]=SubStringBJ(GetEventPlayerChatString(),2,'d')
endfunction

function xb takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="! ")
endfunction

function ob takes nothing returns nothing
    set l[(1+GetPlayerId(GetTriggerPlayer()))]=(l[(1+GetPlayerId(GetTriggerPlayer()))]+" "+SubStringBJ(GetEventPlayerChatString(),3,'d'))
endfunction

function ib takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="@ ")
endfunction

function ab takes nothing returns nothing
    set m[(1+GetPlayerId(GetTriggerPlayer()))]=(m[(1+GetPlayerId(GetTriggerPlayer()))]+" "+SubStringBJ(GetEventPlayerChatString(),3,'d'))
endfunction

function Vb takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="# ")
endfunction

function Eb takes nothing returns nothing
    set M[(1+GetPlayerId(GetTriggerPlayer()))]=(M[(1+GetPlayerId(GetTriggerPlayer()))]+" "+SubStringBJ(GetEventPlayerChatString(),3,'d'))
endfunction

function Ob takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="$ ")
endfunction

function Rb takes nothing returns nothing
    set L[(1+GetPlayerId(GetTriggerPlayer()))]=(L[(1+GetPlayerId(GetTriggerPlayer()))]+" "+SubStringBJ(GetEventPlayerChatString(),3,'d'))
endfunction

function Ab takes nothing returns boolean
    return(GetSpellAbilityId()=='A011')
endfunction

function Nb takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,15.,("메모[!] : "+l[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]))
endfunction

function Bb takes nothing returns boolean
    return(GetSpellAbilityId()=='A013')
endfunction

function cb takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,15.,"메모[@] : "+m[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))])
endfunction

function db takes nothing returns boolean
    return(GetSpellAbilityId()=='A014')
endfunction

function Db takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,15.,"메모[#] : "+M[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))])
endfunction

function Fb takes nothing returns boolean
    return(GetSpellAbilityId()=='A012')
endfunction

function gb takes nothing returns nothing
    call DisplayTimedTextToPlayer(GetOwningPlayer(GetTriggerUnit()),.8,0,15.,"메모[$] : "+L[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))])
endfunction

function hb takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="-!")or(SubStringBJ(GetEventPlayerChatString(),1,2)=="-@")or(SubStringBJ(GetEventPlayerChatString(),1,2)=="-#")or(SubStringBJ(GetEventPlayerChatString(),1,2)=="-$")
endfunction

function Hb takes nothing returns boolean
    return(hb())
endfunction

function jb takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="-!")
endfunction

function Jb takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="-@")
endfunction

function kb takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="-#")
endfunction

function Kb takes nothing returns boolean
    return(SubStringBJ(GetEventPlayerChatString(),1,2)=="-$")
endfunction

function lb takes nothing returns nothing
    if(jb()) then
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,("메모[!] : "+l[(1+GetPlayerId(GetTriggerPlayer()))]))
    endif
    if(Jb()) then
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,("메모[@] : "+m[(1+GetPlayerId(GetTriggerPlayer()))]))
    endif
    if(kb()) then
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,("메모[#] : "+M[(1+GetPlayerId(GetTriggerPlayer()))]))
    endif
    if(Kb()) then
        call DisplayTimedTextToPlayer(GetTriggerPlayer(),.8,0,15.,("메모[$] : "+L[(1+GetPlayerId(GetTriggerPlayer()))]))
    endif
endfunction

function mb takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(O[2]))]))and(IsUnitDeadBJ(o[(1+GetPlayerId(O[3]))]))and(IsUnitDeadBJ(o[(1+GetPlayerId(O[6]))]))and(U=="트롤 부족의 반란")
endfunction

function Mb takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(O[8]))]))and(U=="트롤 부족의 반란")
endfunction

function pb takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(O[1]))]))and(U=="트롤 부족의 반란")
endfunction

function Pb takes nothing returns boolean
    return(IsUnitAliveBJ(o[(1+GetPlayerId(O[7]))])==false)and(IsUnitAliveBJ(o[(1+GetPlayerId(O[9]))])==false)and(IsUnitAliveBJ(o[(1+GetPlayerId(O[$A]))])==false)and(IsUnitAliveBJ(o[(1+GetPlayerId(O[$B]))])==false)and(U=="리델루트 황야")
endfunction

function qb takes nothing returns boolean
    return(GetUnitAbilityLevelSwapped('A02N',o[(1+GetPlayerId(O[7]))])==0)and(IsUnitAliveBJ(o[(1+GetPlayerId(O[9]))])==false)and(IsUnitAliveBJ(o[(1+GetPlayerId(O[$A]))])==false)and(IsUnitAliveBJ(o[(1+GetPlayerId(O[$B]))])==false)and(IsUnitAliveBJ(o[(1+GetPlayerId(O[$C]))])==false)and(U=="리델루트 황야")
endfunction

function Qb takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(O[1]))]))and(U=="리델루트 황야")
endfunction

function sb takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(O[1]))]))and(IsUnitDeadBJ(o[(1+GetPlayerId(O[2]))]))and(U=="태초의 전쟁")
endfunction

function Sb takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(O[7]))]))and(U=="태초의 전쟁")
endfunction

function tb takes nothing returns boolean
    return(IsUnitDeadBJ(o[(1+GetPlayerId(O[8]))]))and(U=="왕자들의 내전")
endfunction

function Tb takes nothing returns boolean
    return(U=="왕자들의 내전")and(IsUnitDeadBJ(o[(1+GetPlayerId(O[1]))]))and(IsUnitDeadBJ(o[(1+GetPlayerId(O[2]))]))and(GetUnitAbilityLevelSwapped('A00E',o[(1+GetPlayerId(O[2]))])!=0)
endfunction

function ub takes nothing returns boolean
    return(U=="왕자들의 내전")and(IsUnitDeadBJ(o[(1+GetPlayerId(O[1]))]))and(GetUnitAbilityLevelSwapped('A00E',o[(1+GetPlayerId(O[2]))])==0)
endfunction

function Ub takes nothing returns boolean
    return(U=="왕자들의 내전")and(IsUnitDeadBJ(o[(1+GetPlayerId(O[1]))]))and(GetUnitAbilityLevelSwapped('A00E',o[(1+GetPlayerId(O[2]))])!=0)
endfunction

function wb takes nothing returns nothing
    if(mb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"얼음 트롤에는 더 이상 공격할 힘이 남아 있지 않습니다!\n\n|c00ff8080트롤 반란자|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(Mb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080얼음 부족|r이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(pb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080트롤 반란자|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(Pb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080다크니스|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(qb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"가디언에는 더 이상 공격할 힘이 남아 있지 않습니다!\n\n|c00ff8080다크니스|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(Qb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080가디언|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(sb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080다크니스|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(Sb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080지상 연합|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(tb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080단테스|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(Tb()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"단테스가 사망하고, 후계자인 메르츠키엘도 사망했습니다.\n\n|c00ff8080카이|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(ub()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080카이|r측이 승리했습니다.")
        call TriggerExecute(Yo)
        call DestroyTrigger(GetTriggeringTrigger())
return
    endif
    if(Ub()) then
        call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,"|c00ff8080메르츠키엘|r이 단테스의 뒤를 이어받았습니다.")
return
    endif
endfunction

function yb takes nothing returns nothing
    local integer a=1
    call PauseGameOn()
    call PauseTimerBJ(true,e)
    call TriggerSleepAction(4.)
    loop
        exitwhen a>$C
        if GetHeroProperName(o[a])=="프레이아" then
            if J then
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,(H[(a)]+(" : "+(GetUnitName(o[(a)])+"(배신)"))))
            else
                call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,(H[(a)]+(" : "+GetHeroProperName(o[(a)]))))
            endif
        else
            call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,(H[(a)]+(" : "+GetHeroProperName(o[(a)]))))
        endif
        set a=a+1
    endloop
    call DisplayTimedTextToPlayer(GetLocalPlayer(),.8,0,30.,("다음 방제 : "+Y))
endfunction

function InitCustomTeams takes nothing returns nothing
    call SetPlayerTeam(Player(0),0)
    call SetPlayerTeam(Player(1),1)
    call SetPlayerTeam(Player(2),1)
    call SetPlayerTeam(Player(3),1)
    call SetPlayerTeam(Player(4),1)
    call SetPlayerTeam(Player(5),1)
    call SetPlayerTeam(Player(6),1)
    call SetPlayerTeam(Player(7),1)
    call SetPlayerTeam(Player(8),1)
    call SetPlayerTeam(Player(9),1)
    call SetPlayerTeam(Player($A),1)
    call SetPlayerTeam(Player($B),1)
endfunction

function main takes nothing returns nothing
    local weathereffect we
    local integer i
    local player p
    local unit u
    local integer unitID
    local trigger t
    local real life
    local integer Jr
    local integer kr
    local version v
    local integer dr
    call SetCameraBounds(-1408.+GetCameraMargin(CAMERA_MARGIN_LEFT),-1792.+GetCameraMargin(CAMERA_MARGIN_BOTTOM),1664.-GetCameraMargin(CAMERA_MARGIN_RIGHT),1280.-GetCameraMargin(CAMERA_MARGIN_TOP),-1408.+GetCameraMargin(CAMERA_MARGIN_LEFT),1280.-GetCameraMargin(CAMERA_MARGIN_TOP),1664.-GetCameraMargin(CAMERA_MARGIN_RIGHT),-1792.+GetCameraMargin(CAMERA_MARGIN_BOTTOM))
    call SetDayNightModels("Environment\\DNC\\DNCLordaeron\\DNCLordaeronTerrain\\DNCLordaeronTerrain.mdl","Environment\\DNC\\DNCLordaeron\\DNCLordaeronUnit\\DNCLordaeronUnit.mdl")
    call SetTerrainFogEx(0,3000.,5000.,.5,.0,.0,.0)
    call NewSoundEnvironment("Default")
    call SetAmbientDaySound("CityScapeDay")
    call SetAmbientNightSound("CityScapeNight")
    call SetMapMusic("Music",true,0)
    set hv=CreateSound("Units\\Orc\\WyvernRider\\WyvernRiderYes4.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(hv,"WyvernRiderYes")
    call SetSoundDuration(hv,$901)
    set Hv=CreateSound("Abilities\\Spells\\Other\\Incinerate\\Incinerate1.wav",false,false,true,$A,$A,"SpellsEAX")
    call SetSoundParamsFromLabel(Hv,"IncinerateDeath")
    call SetSoundDuration(Hv,$A9D)
    set jv=CreateSound("Units\\Creeps\\Ogre\\OgreDeath1.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(jv,"OgreDeath")
    call SetSoundDuration(jv,$80B)
    set Jv=CreateSound("Sound\\Interface\\ArrangedTeamInvitation.wav",false,false,false,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(Jv,"ArrangedTeamInvitation")
    call SetSoundDuration(Jv,$B62)
    set kv=CreateSound("Sound\\Interface\\GoodJob.wav",false,false,false,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(kv,"GoodJob")
    call SetSoundDuration(kv,$9F4)
    set Kv=CreateSound("Units\\NightElf\\Illidan\\IllidanPissed1.wav",false,false,true,$A,$A,"HeroAcksEAX")
    call SetSoundParamsFromLabel(Kv,"IllidanPissed")
    call SetSoundDuration(Kv,$AB0)
    set lv=CreateSound("Sound\\Interface\\GameFound.wav",false,false,false,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(lv,"GameFound")
    call SetSoundDuration(lv,7488)
    set Lv=CreateSound("Units\\NightElf\\HeroWarden\\HeroWardenWarcry1.wav",false,false,true,$A,$A,"HeroAcksEAX")
    call SetSoundParamsFromLabel(Lv,"HeroWardenWarcry")
    call SetSoundDuration(Lv,$63C)
    set mv=CreateSound("Sound\\Interface\\SecretFound.wav",false,false,false,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(mv,"SecretFound")
    call SetSoundDuration(mv,$9DD)
    set Mv=CreateSound("Units\\Undead\\EvilArthas\\EvilArthasYesAttack2.wav",false,false,true,$A,$A,"HeroAcksEAX")
    call SetSoundParamsFromLabel(Mv,"EvilArthasYesAttack")
    call SetSoundDuration(Mv,$4B2)
    set pv=CreateSound("Units\\Undead\\EvilArthas\\EvilArthasPissed5.wav",false,false,true,$A,$A,"HeroAcksEAX")
    call SetSoundParamsFromLabel(pv,"EvilArthasPissed")
    call SetSoundDuration(pv,$881)
    set Pv=CreateSound("Units\\Human\\Phoenix\\PhoenixBirth.wav",false,false,true,$A,$A,"SpellsEAX")
    call SetSoundParamsFromLabel(Pv,"PhoenixBirth")
    call SetSoundDuration(Pv,$5E8)
    set qv=CreateSound("Units\\NightElf\\Illidan\\IllidanMorphedYes3.wav",false,false,true,$A,$A,"HeroAcksEAX")
    call SetSoundParamsFromLabel(qv,"IllidanMorphedYes")
    call SetSoundDuration(qv,$4CC)
    set Qv=CreateSound("Sound\\Interface\\QuestNew.wav",false,false,false,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(Qv,"QuestNew")
    call SetSoundDuration(Qv,$EA6)
    set sv=CreateSound("Sound\\Interface\\MapPing.wav",false,false,false,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(sv,"MapPing")
    call SetSoundDuration(sv,$665)
    set Sv=CreateSound("Abilities\\Spells\\NightElf\\Barkskin\\BarkSkinTarget1.wav",false,false,true,$A,$A,"SpellsEAX")
    call SetSoundParamsFromLabel(Sv,"Barkskin")
    call SetSoundDuration(Sv,$A6D)
    set tv=CreateSound("Abilities\\Spells\\Undead\\RaiseSkeletonWarrior\\RaiseSkeleton.wav",false,false,true,$A,$A,"SpellsEAX")
    call SetSoundParamsFromLabel(tv,"RaiseSkeletonArcher")
    call SetSoundDuration(tv,$91A)
    set Tv=CreateSound("Units\\Undead\\Abomination\\AbominationReady1.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(Tv,"AbominationReady")
    call SetSoundDuration(Tv,$8BB)
    set uv=CreateSound("Units\\Undead\\Necromancer\\NecromancerReady1.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(uv,"NecromancerReady")
    call SetSoundDuration(uv,$5A8)
    set Uv=CreateSound("Units\\Undead\\Abomination\\AbominationWarcry1.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(Uv,"AbominationWarcry")
    call SetSoundDuration(Uv,$812)
    set wv=CreateSound("Units\\NightElf\\HeroWarden\\HeroWardenWhat5.wav",false,false,true,$A,$A,"HeroAcksEAX")
    call SetSoundParamsFromLabel(wv,"HeroWardenWhat")
    call SetSoundDuration(wv,$A2E)
    set Wv=CreateSound("Units\\Human\\BloodElfSpellThief\\SpellbreakerWarcry1.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(Wv,"SpellBreakerWarcry")
    call SetSoundDuration(Wv,$90F)
    set yv=CreateSound("Buildings\\Human\\AltarOfKings\\AltarOfKingsWhat1.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(yv,"AltarOfKingsWhat")
    call SetSoundDuration(yv,$E01)
    set Yv=CreateSound("Units\\NightElf\\DruidOfTheClaw\\DruidOfTheClawWarcry1.wav",false,false,true,$A,$A,"DefaultEAXON")
    call SetSoundParamsFromLabel(Yv,"DruidOfTheClawWarcry")
    call SetSoundDuration(Yv,$A63)
    set zv=CreateSound("Abilities\\Spells\\NightElf\\BattleRoar\\BattleRoar.wav",false,true,true,$A,$A,"SpellsEAX")
    call SetSoundParamsFromLabel(zv,"BattleRoar")
    call SetSoundDuration(zv,$7C7)
    set Iv=Rect(640.,256.,768.,384.)
    set Av=Rect(256.,256.,384.,384.)
    set Nv=Rect(-128.,256.,.0,384.)
    set bv=Rect(-512.,256.,-384.,384.)
    set Bv=Rect(-512.,-128.,-384.,.0)
    set cv=Rect(-512.,-512.,-384.,-384.)
    set Cv=Rect(-512.,-896.,-384.,-768.)
    set dv=Rect(-128.,-896.,.0,-768.)
    set Dv=Rect(256.,-896.,384.,-768.)
    set fv=Rect(640.,-896.,768.,-768.)
    set Fv=Rect(640.,-512.,768.,-384.)
    set gv=Rect(640.,-128.,768.,.0)
    set Gv=CreateCameraSetup()
    call CameraSetupSetField(Gv,CAMERA_FIELD_ZOFFSET,.0,.0)
    call CameraSetupSetField(Gv,CAMERA_FIELD_ROTATION,90.,.0)
    call CameraSetupSetField(Gv,CAMERA_FIELD_ANGLE_OF_ATTACK,304.,.0)
    call CameraSetupSetField(Gv,CAMERA_FIELD_TARGET_DISTANCE,2657.3,.0)
    call CameraSetupSetField(Gv,CAMERA_FIELD_ROLL,.0,.0)
    call CameraSetupSetField(Gv,CAMERA_FIELD_FIELD_OF_VIEW,70.,.0)
    call CameraSetupSetField(Gv,CAMERA_FIELD_FARZ,5000.,.0)
    call CameraSetupSetDestPosition(Gv,125.8,-213.8,.0)
    set p=Player(0)
    set u=CreateUnit(p,'u000',712.7,317.5,225.)
    set p=Player(1)
    set u=CreateUnit(p,'u000',322.6,309.5,270.)
    set p=Player(2)
    set u=CreateUnit(p,'u000',-62.9,317.5,270.)
    set p=Player(3)
    set u=CreateUnit(p,'u000',-443.2,321.4,315.)
    set p=Player(4)
    set u=CreateUnit(p,'u000',-444.4,-60.8,.0)
    set p=Player(5)
    set u=CreateUnit(p,'u000',-439.9,-449.2,.0)
    set p=Player(6)
    set u=CreateUnit(p,'u000',-441.8,-826.,45.)
    set p=Player(7)
    set u=CreateUnit(p,'u000',-59.4,-826.8,90.)
    set p=Player(8)
    set u=CreateUnit(p,'u000',325.2,-837.8,90.)
    set p=Player(9)
    set u=CreateUnit(p,'u000',710.3,-832.2,135.)
    set p=Player($A)
    set u=CreateUnit(p,'u000',701.9,-448.7,180.)
    set p=Player($B)
    set u=CreateUnit(p,'u000',703.,-68.4,180.)
    call ConfigureNeutralVictim()
    set ir=Filter(function Hr)
    set filterIssueHauntOrderAtLocBJ=Filter(function IssueHauntOrderAtLocBJFilter)
    set filterEnumDestructablesInCircleBJ=Filter(function Xr)
    set filterGetUnitsInRectOfPlayer=Filter(function GetUnitsInRectOfPlayerFilter)
    set filterGetUnitsOfTypeIdAll=Filter(function GetUnitsOfTypeIdAllFilter)
    set filterGetUnitsOfPlayerAndTypeId=Filter(function GetUnitsOfPlayerAndTypeIdFilter)
    set filterMeleeTrainedUnitIsHeroBJ=Filter(function MeleeTrainedUnitIsHeroBJFilter)
    set filterLivingPlayerUnitsOfTypeId=Filter(function LivingPlayerUnitsOfTypeIdFilter)
    set Jr=0
    loop
        exitwhen Jr==16
        set bj_FORCE_PLAYER[Jr]=CreateForce()
        call ForceAddPlayer(bj_FORCE_PLAYER[Jr],Player(Jr))
        set Jr=Jr+1
    endloop
    set bj_FORCE_ALL_PLAYERS=CreateForce()
    call ForceEnumPlayers(bj_FORCE_ALL_PLAYERS,null)
    set bj_cineModePriorSpeed=GetGameSpeed()
    set bj_cineModePriorFogSetting=IsFogEnabled()
    set bj_cineModePriorMaskSetting=IsFogMaskEnabled()
    set Jr=0
    loop
        exitwhen Jr>=bj_MAX_QUEUED_TRIGGERS
        set bj_queuedExecTriggers[Jr]=null
        set bj_queuedExecUseConds[Jr]=false
        set Jr=Jr+1
    endloop
    set bj_isSinglePlayer=false
    set kr=0
    set Jr=0
    loop
        exitwhen Jr>=$C
        if(GetPlayerController(Player(Jr))==MAP_CONTROL_USER and GetPlayerSlotState(Player(Jr))==PLAYER_SLOT_STATE_PLAYING) then
            set kr=kr+1
        endif
        set Jr=Jr+1
    endloop
    set bj_isSinglePlayer=(kr==1)
    set bj_rescueSound=CreateSoundFromLabel("Rescue",false,false,false,$2710,$2710)
    set bj_questDiscoveredSound=CreateSoundFromLabel("QuestNew",false,false,false,$2710,$2710)
    set bj_questUpdatedSound=CreateSoundFromLabel("QuestUpdate",false,false,false,$2710,$2710)
    set bj_questCompletedSound=CreateSoundFromLabel("QuestCompleted",false,false,false,$2710,$2710)
    set bj_questFailedSound=CreateSoundFromLabel("QuestFailed",false,false,false,$2710,$2710)
    set bj_questHintSound=CreateSoundFromLabel("Hint",false,false,false,$2710,$2710)
    set bj_questSecretSound=CreateSoundFromLabel("SecretFound",false,false,false,$2710,$2710)
    set bj_questItemAcquiredSound=CreateSoundFromLabel("ItemReward",false,false,false,$2710,$2710)
    set bj_questWarningSound=CreateSoundFromLabel("Warning",false,false,false,$2710,$2710)
    set bj_victoryDialogSound=CreateSoundFromLabel("QuestCompleted",false,false,false,$2710,$2710)
    set bj_defeatDialogSound=CreateSoundFromLabel("QuestFailed",false,false,false,$2710,$2710)
    call DelayedSuspendDecayCreate()
    set v=VersionGet()
    if(v==VERSION_REIGN_OF_CHAOS) then
        set bj_MELEE_MAX_TWINKED_HEROES=bj_MELEE_MAX_TWINKED_HEROES_V0
    else
        set bj_MELEE_MAX_TWINKED_HEROES=bj_MELEE_MAX_TWINKED_HEROES_V1
    endif
    call InitQueuedTriggers()
    call InitRescuableBehaviorBJ()
    call InitDNCSounds()
    call InitMapRects()
    call InitSummonableCaps()
    set dr=0
    loop
        set bj_stockAllowedPermanent[dr]=false
        set bj_stockAllowedCharged[dr]=false
        set bj_stockAllowedArtifact[dr]=false
        set dr=dr+1
        exitwhen dr>$A
    endloop
    call SetAllItemTypeSlots($B)
    call SetAllUnitTypeSlots($B)
    set bj_stockUpdateTimer=CreateTimer()
    call TimerStart(bj_stockUpdateTimer,bj_STOCK_RESTOCK_INITIAL_DELAY,false,function Gr)
    set bj_stockItemPurchased=CreateTrigger()
    call TriggerRegisterPlayerUnitEvent(bj_stockItemPurchased,Player($F),EVENT_PLAYER_UNIT_SELL_ITEM,null)
    call TriggerAddAction(bj_stockItemPurchased,function RemovePurchasedItem)
    call DetectGameStarted()
    set i=0
    set e=CreateTimer()
    set V=DialogCreate()
    set R=DialogCreate()
    set i=0
    loop
exitwhen(i>$D)
        set A[i]=""
        set b[i]=""
        set i=i+1
    endloop
    set i=0
    loop
exitwhen(i>2)
        set B[i]=CreateForce()
        set G[i]=DialogCreate()
        set w[i]=DialogCreate()
        set av[i]=DialogCreate()
        set i=i+1
    endloop
    set c=DialogCreate()
    set i=0
    loop
exitwhen(i>$C)
        set d[i]=0
        set D[i]=0
        set f[i]=0
        set H[i]=""
        set j[i]=0
        set k[i]=false
        set K[i]=false
        set l[i]=""
        set L[i]=""
        set m[i]=""
        set M[i]=""
        set Rv[i]=false
        set i=i+1
    endloop
    set S=CreateTimer()
    set T=CreateTimer()
    set y=CreateTimer()
    set z=CreateTimer()
    set i=0
    loop
exitwhen(i>1)
        set vv[i]=false
        set i=i+1
    endloop
    set ev=DialogCreate()
    set iv=CreateTimer()
    set Vv=DialogCreate()
    set Zv=CreateTrigger()
    call TriggerAddAction(Zv,function Qr)
    set ve=CreateTrigger()
    call TriggerAddAction(ve,function Sr)
    set ee=CreateTrigger()
    call TriggerAddAction(ee,function Tr)
    set xe=CreateTrigger()
    call TriggerAddAction(xe,function Ur)
    set oe=CreateTrigger()
    call TriggerAddAction(oe,function Wr)
    set re=CreateTrigger()
    call TriggerRegisterTimerEventSingle(re,.01)
    call TriggerAddAction(re,function Yr)
    set ie=CreateTrigger()
    call TriggerRegisterDialogEvent(ie,V)
    call TriggerAddAction(ie,function ri)
    set ae=CreateTrigger()
    call TriggerRegisterTimerExpireEvent(ae,T)
    call TriggerAddAction(ae,function ni)
    set ne=CreateTrigger()
    call TriggerAddAction(ne,function Ei)
    set Ve=CreateTrigger()
    call TriggerAddAction(Ve,function Bi)
    set Ee=CreateTrigger()
    call TriggerAddAction(Ee,function Fi)
    set Xe=CreateTrigger()
    call TriggerAddAction(Xe,function hi)
    set Oe=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(Oe,Player(0),"-공지",false)
    call TriggerAddCondition(Oe,Condition(function ji))
    call TriggerAddAction(Oe,function Ji)
    set Re=CreateTrigger()
    call TriggerAddAction(Re,function Ki)
    set Ie=CreateTrigger()
    call DisableTrigger(Ie)
    call TriggerRegisterTimerEventPeriodic(Ie,1.)
    call TriggerAddAction(Ie,function mi)
    set Ae=CreateTrigger()
    call DisableTrigger(Ae)
    call TriggerRegisterTimerEventPeriodic(Ae,1.)
    call TriggerAddAction(Ae,function pi)
    set Ne=CreateTrigger()
    call TriggerRegisterTimerExpireEvent(Ne,e)
    call TriggerAddAction(Ne,function qi)
    set be=CreateTrigger()
    call TriggerRegisterPlayerEventLeave(be,Player(0))
    call TriggerRegisterPlayerEventLeave(be,Player(1))
    call TriggerRegisterPlayerEventLeave(be,Player(2))
    call TriggerRegisterPlayerEventLeave(be,Player(3))
    call TriggerRegisterPlayerEventLeave(be,Player(4))
    call TriggerRegisterPlayerEventLeave(be,Player(5))
    call TriggerRegisterPlayerEventLeave(be,Player(6))
    call TriggerRegisterPlayerEventLeave(be,Player(7))
    call TriggerRegisterPlayerEventLeave(be,Player(8))
    call TriggerRegisterPlayerEventLeave(be,Player(9))
    call TriggerRegisterPlayerEventLeave(be,Player($A))
    call TriggerRegisterPlayerEventLeave(be,Player($B))
    call TriggerAddCondition(be,Condition(function si))
    call TriggerAddAction(be,function Si)
    set Be=CreateTrigger()
    call TriggerAddCondition(Be,Condition(function Ti))
    call TriggerAddAction(Be,function ui)
    set ce=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ce,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ce,Condition(function wi))
    call TriggerAddAction(ce,function Wi)
    set Ce=CreateTrigger()
    call TriggerRegisterDialogEvent(Ce,R)
    call TriggerAddAction(Ce,function zi)
    set de=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(de,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(de,Condition(function va))
    call TriggerAddAction(de,function ea)
    set De=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(De,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(De,Condition(function oa))
    call TriggerAddAction(De,function ra)
    set fe=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(fe,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(fe,Condition(function na))
    call TriggerAddAction(fe,function Ca)
    set Fe=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Fe,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Fe,Condition(function fa))
    call TriggerAddAction(Fe,function Fa)
    set ge=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ge,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ge,Condition(function ha))
    call TriggerAddAction(ge,function ja)
    set Ge=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ge,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ge,Condition(function Ka))
    call TriggerAddAction(Ge,function La)
    set he=CreateTrigger()
    call TriggerRegisterDialogEvent(he,av[1])
    call TriggerRegisterDialogEvent(he,av[2])
    call TriggerAddAction(he,function Pa)
    set He=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(He,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(He,Condition(function sa))
    call TriggerAddAction(He,function Sa)
    set je=CreateTrigger()
    call TriggerRegisterDialogEvent(je,c)
    call TriggerAddAction(je,function Ua)
    set Je=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Je,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Je,Condition(function ya))
    call TriggerAddAction(Je,function Za)
    set ke=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ke,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ke,Condition(function xn))
    call TriggerAddAction(ke,function rn)
    set Ke=CreateTrigger()
    call TriggerRegisterDialogEvent(Ke,G[1])
    call TriggerRegisterDialogEvent(Ke,G[2])
    call TriggerAddCondition(Ke,Condition(function an))
    call TriggerAddAction(Ke,function cn)
    set le=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(le,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(le,Condition(function dn))
    call TriggerAddAction(le,function hn)
    set Le=CreateTrigger()
    call TriggerRegisterDialogEvent(Le,w[1])
    call TriggerRegisterDialogEvent(Le,w[2])
    call TriggerAddAction(Le,function Jn)
    set me=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(me,Player(0),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(1),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(2),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(3),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(4),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(5),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(6),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(7),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(8),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player(9),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player($A),"-전체",false)
    call TriggerRegisterPlayerChatEvent(me,Player($B),"-전체",false)
    call TriggerAddCondition(me,Condition(function ln))
    call TriggerAddAction(me,function mn)
    set Me=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(Me,Player(0),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(1),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(2),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(3),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(4),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(5),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(6),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(7),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(8),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player(9),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player($A),"-전체",false)
    call TriggerRegisterPlayerChatEvent(Me,Player($B),"-전체",false)
    call TriggerAddCondition(Me,Condition(function Pn))
    call TriggerAddAction(Me,function Qn)
    set pe=CreateTrigger()
    call TriggerRegisterTimerExpireEvent(pe,z)
    call TriggerAddAction(pe,function Tn)
    set Pe=CreateTrigger()
    call TriggerRegisterTimerExpireEvent(Pe,S)
    call TriggerAddAction(Pe,function Wn)
    set qe=CreateTrigger()
    call TriggerRegisterTimerExpireEvent(qe,iv)
    call TriggerAddAction(qe,function vV)
    set Qe=CreateTrigger()
    call TriggerRegisterTimerExpireEvent(Qe,y)
    call TriggerAddAction(Qe,function rV)
    set se=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(se,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(se,Condition(function aV))
    call TriggerAddAction(se,function OV)
    set Se=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Se,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Se,Condition(function IV))
    call TriggerAddAction(Se,function NV)
    set te=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(te,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(te,Condition(function BV))
    call TriggerAddAction(te,function CV)
    set Te=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Te,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Te,Condition(function DV))
    call TriggerAddAction(Te,function fV)
    set ue=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ue,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ue,Condition(function gV))
    call TriggerAddAction(ue,function hV)
    set Ue=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ue,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ue,Condition(function jV))
    call TriggerAddAction(Ue,function kV)
    set We=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(We,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(We,Condition(function lV))
    call TriggerAddAction(We,function LV)
    set ye=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ye,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(ye,Condition(function MV))
    call TriggerAddAction(ye,function QV)
    set Ye=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ye,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ye,Condition(function SV))
    call TriggerAddAction(Ye,function TV)
    set ze=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ze,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ze,Condition(function UV))
    call TriggerAddAction(ze,function wV)
    set Ze=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ze,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ze,Condition(function yV))
    call TriggerAddAction(Ze,function YV)
    set vx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(vx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(vx,Condition(function ZV))
    call TriggerAddAction(vx,function rE)
    set ex=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ex,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ex,Condition(function aE))
    call TriggerAddAction(ex,function VE)
    set xx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(xx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(xx,Condition(function XE))
    call TriggerAddAction(xx,function OE)
    set ox=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ox,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ox,Condition(function IE))
    call TriggerAddAction(ox,function NE)
    set rx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(rx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(rx,Condition(function BE))
    call TriggerAddAction(rx,function cE)
    set ix=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ix,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ix,Condition(function dE))
    call TriggerAddAction(ix,function fE)
    set ax=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ax,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ax,Condition(function gE))
    call TriggerAddAction(ax,function hE)
    set nx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(nx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(nx,Condition(function jE))
    call TriggerAddAction(nx,function JE)
    set Vx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Vx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Vx,Condition(function KE))
    call TriggerAddAction(Vx,function LE)
    set Ex=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ex,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ex,Condition(function pE))
    call TriggerAddAction(Ex,function PE)
    set Xx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Xx,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Xx,Condition(function QE))
    call TriggerAddAction(Xx,function sE)
    set Ox=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ox,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Ox,Condition(function tE))
    call TriggerAddAction(Ox,function uE)
    set Rx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Rx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Rx,Condition(function wE))
    call TriggerAddAction(Rx,function yE)
    set Ix=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ix,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ix,Condition(function zE))
    call TriggerAddAction(Ix,function ZE)
    set Ax=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ax,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ax,Condition(function eX))
    call TriggerAddAction(Ax,function xX)
    set Nx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Nx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Nx,Condition(function rX))
    call TriggerAddAction(Nx,function iX)
    set bx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(bx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(bx,Condition(function nX))
    call TriggerAddAction(bx,function EX)
    set Bx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Bx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Bx,Condition(function OX))
    call TriggerAddAction(Bx,function AX)
    set cx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(cx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(cx,Condition(function bX))
    call TriggerAddAction(cx,function BX)
    set Cx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Cx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Cx,Condition(function CX))
    call TriggerAddAction(Cx,function DX)
    set Dx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Dx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Dx,Condition(function FX))
    call TriggerAddAction(Dx,function gX)
    set fx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(fx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(fx,Condition(function hX))
    call TriggerAddAction(fx,function jX)
    set Fx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Fx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Fx,Condition(function kX))
    call TriggerAddAction(Fx,function lX)
    set gx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(gx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(gx,Condition(function mX))
    call TriggerAddAction(gx,function pX)
    set Gx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Gx,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Gx,Condition(function qX))
    call TriggerAddAction(Gx,function QX)
    set hx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(hx,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(hx,Condition(function SX))
    call TriggerAddAction(hx,function TX)
    set Hx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Hx,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Hx,Condition(function UX))
    call TriggerAddAction(Hx,function WX)
    set jx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(jx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(jx,Condition(function YX))
    call TriggerAddAction(jx,function ZX)
    set Jx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Jx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Jx,Condition(function eO))
    call TriggerAddAction(Jx,function xO)
    set kx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(kx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(kx,Condition(function rO))
    call TriggerAddAction(kx,function iO)
    set Kx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Kx,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Kx,Condition(function nO))
    call TriggerAddAction(Kx,function RO)
    set lx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(lx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(lx,Condition(function AO))
    call TriggerAddAction(lx,function NO)
    set Lx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Lx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Lx,Condition(function BO))
    call TriggerAddAction(Lx,function CO)
    set mx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(mx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(mx,Condition(function DO))
    call TriggerAddAction(mx,function fO)
    set Mx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Mx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Mx,Condition(function gO))
    call TriggerAddAction(Mx,function hO)
    set px=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(px,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(px,Condition(function jO))
    call TriggerAddAction(px,function kO)
    set Px=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Px,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Px,Condition(function lO))
    call TriggerAddAction(Px,function mO)
    set qx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(qx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(qx,Condition(function pO))
    call TriggerAddAction(qx,function qO)
    set Qx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Qx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Qx,Condition(function sO))
    call TriggerAddAction(Qx,function SO)
    set sx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(sx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(sx,Condition(function TO))
    call TriggerAddAction(sx,function zO)
    set Sx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Sx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Sx,Condition(function vR))
    call TriggerAddAction(Sx,function VR)
    set tx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(tx,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(tx,Condition(function OR))
    call TriggerAddAction(tx,function AR)
    set Tx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Tx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Tx,Condition(function bR))
    call TriggerAddAction(Tx,function BR)
    set ux=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ux,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ux,Condition(function CR))
    call TriggerAddAction(ux,function dR)
    set Ux=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ux,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ux,Condition(function fR))
    call TriggerAddAction(Ux,function gR)
    set wx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(wx,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(wx,Condition(function hR))
    call TriggerAddAction(wx,function kR)
    set Wx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Wx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Wx,Condition(function lR))
    call TriggerAddAction(Wx,function LR)
    set yx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(yx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(yx,Condition(function MR))
    call TriggerAddAction(yx,function pR)
    set Yx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Yx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Yx,Condition(function qR))
    call TriggerAddAction(Yx,function tR)
    set zx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(zx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(zx,Condition(function uR))
    call TriggerAddAction(zx,function wR)
    set Zx=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Zx,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Zx,Condition(function yR))
    call TriggerAddAction(Zx,function zR)
    set vo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(vo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(vo,Condition(function vI))
    call TriggerAddAction(vo,function xI)
    set eo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(eo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(eo,Condition(function rI))
    call TriggerAddAction(eo,function iI)
    set xo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(xo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(xo,Condition(function nI))
    call TriggerAddAction(xo,function VI)
    set oo=CreateTrigger()
    call TriggerRegisterDialogEvent(oo,ev)
    call TriggerAddAction(oo,function II)
    set ro=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ro,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ro,Condition(function NI))
    call TriggerAddAction(ro,function bI)
    set io=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(io,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(io,Condition(function cI))
    call TriggerAddAction(io,function CI)
    set ao=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ao,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ao,Condition(function DI))
    call TriggerAddAction(ao,function GI)
    set no=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(no,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(no,Condition(function HI))
    call TriggerAddAction(no,function jI)
    set Vo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Vo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Vo,Condition(function kI))
    call TriggerAddAction(Vo,function LI)
    set Eo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Eo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Eo,Condition(function MI))
    call TriggerAddAction(Eo,function pI)
    set Xo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Xo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Xo,Condition(function qI))
    call TriggerAddAction(Xo,function sI)
    set Oo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Oo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Oo,Condition(function tI))
    call TriggerAddAction(Oo,function UI)
    set Ro=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ro,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ro,Condition(function WI))
    call TriggerAddAction(Ro,function zI)
    set Io=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Io,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Io,Condition(function eA))
    call TriggerAddAction(Io,function aA)
    set Ao=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ao,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ao,Condition(function VA))
    call TriggerAddAction(Ao,function XA)
    set No=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(No,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(No,Condition(function RA))
    call TriggerAddAction(No,function AA)
    set bo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(bo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(bo,Condition(function bA))
    call TriggerAddAction(bo,function BA)
    set Bo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Bo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Bo,Condition(function CA))
    call TriggerAddAction(Bo,function dA)
    set co=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(co,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(co,Condition(function fA))
    call TriggerAddAction(co,function FA)
    set Co=CreateTrigger()
    call TriggerRegisterDialogEvent(Co,Vv)
    call TriggerAddAction(Co,function HA)
    set do=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(do,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(do,Condition(function JA))
    call TriggerAddAction(do,function lA)
    set Do=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Do,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Do,Condition(function mA))
    call TriggerAddAction(Do,function PA)
    set fo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(fo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(fo,Condition(function QA))
    call TriggerAddAction(fo,function tA)
    set Fo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Fo,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Fo,Condition(function uA))
    call TriggerAddAction(Fo,function wA)
    set go=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(go,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(go,Condition(function yA))
    call TriggerAddAction(go,function ZA)
    set Go=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Go,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Go,Condition(function eN))
    call TriggerAddAction(Go,function rN)
    set ho=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ho,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ho,Condition(function aN))
    call TriggerAddAction(ho,function VN)
    set Ho=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ho,EVENT_PLAYER_UNIT_SPELL_CAST)
    call TriggerAddCondition(Ho,Condition(function XN))
    call TriggerAddAction(Ho,function RN)
    set jo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(jo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(jo,Condition(function AN))
    call TriggerAddAction(jo,function BN)
    set Jo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Jo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Jo,Condition(function CN))
    call TriggerAddAction(Jo,function DN)
    set ko=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(ko,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(ko,Condition(function FN))
    call TriggerAddAction(ko,function GN)
    set Ko=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Ko,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Ko,Condition(function HN))
    call TriggerAddAction(Ko,function JN)
    set lo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(lo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(lo,Condition(function KN))
    call TriggerAddAction(lo,function LN)
    set Lo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Lo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Lo,Condition(function MN))
    call TriggerAddAction(Lo,function pN)
    set mo=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(mo,Player(0),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(1),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(2),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(3),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(4),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(5),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(6),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(7),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(8),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player(9),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player($A),"-",false)
    call TriggerRegisterPlayerChatEvent(mo,Player($B),"-",false)
    call TriggerAddCondition(mo,Condition(function QN))
    call TriggerAddAction(mo,function sN)
    set Mo=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(Mo,Player(0),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(1),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(2),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(3),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(4),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(5),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(6),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(7),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(8),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player(9),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player($A),"!",false)
    call TriggerRegisterPlayerChatEvent(Mo,Player($B),"!",false)
    call TriggerAddCondition(Mo,Condition(function tN))
    call TriggerAddAction(Mo,function TN)
    set po=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(po,Player(0),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(1),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(2),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(3),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(4),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(5),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(6),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(7),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(8),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player(9),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player($A),"@",false)
    call TriggerRegisterPlayerChatEvent(po,Player($B),"@",false)
    call TriggerAddCondition(po,Condition(function UN))
    call TriggerAddAction(po,function wN)
    set Po=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(Po,Player(0),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(1),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(2),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(3),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(4),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(5),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(6),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(7),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(8),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player(9),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player($A),"#",false)
    call TriggerRegisterPlayerChatEvent(Po,Player($B),"#",false)
    call TriggerAddCondition(Po,Condition(function yN))
    call TriggerAddAction(Po,function YN)
    set qo=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(qo,Player(0),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(1),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(2),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(3),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(4),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(5),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(6),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(7),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(8),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player(9),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player($A),"$",false)
    call TriggerRegisterPlayerChatEvent(qo,Player($B),"$",false)
    call TriggerAddCondition(qo,Condition(function ZN))
    call TriggerAddAction(qo,function vb)
    set Qo=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(Qo,Player(0),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(1),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(2),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(3),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(4),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(5),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(6),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(7),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(8),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player(9),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player($A),"!",false)
    call TriggerRegisterPlayerChatEvent(Qo,Player($B),"!",false)
    call TriggerAddCondition(Qo,Condition(function xb))
    call TriggerAddAction(Qo,function ob)
    set so=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(so,Player(0),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(1),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(2),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(3),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(4),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(5),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(6),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(7),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(8),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player(9),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player($A),"@",false)
    call TriggerRegisterPlayerChatEvent(so,Player($B),"@",false)
    call TriggerAddCondition(so,Condition(function ib))
    call TriggerAddAction(so,function ab)
    set So=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(So,Player(0),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(1),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(2),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(3),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(4),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(5),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(6),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(7),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(8),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player(9),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player($A),"#",false)
    call TriggerRegisterPlayerChatEvent(So,Player($B),"#",false)
    call TriggerAddCondition(So,Condition(function Vb))
    call TriggerAddAction(So,function Eb)
    set to=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(to,Player(0),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(1),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(2),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(3),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(4),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(5),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(6),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(7),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(8),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player(9),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player($A),"$",false)
    call TriggerRegisterPlayerChatEvent(to,Player($B),"$",false)
    call TriggerAddCondition(to,Condition(function Ob))
    call TriggerAddAction(to,function Rb)
    set To=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(To,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(To,Condition(function Ab))
    call TriggerAddAction(To,function Nb)
    set uo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(uo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(uo,Condition(function Bb))
    call TriggerAddAction(uo,function cb)
    set Uo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(Uo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(Uo,Condition(function db))
    call TriggerAddAction(Uo,function Db)
    set wo=CreateTrigger()
    call TriggerRegisterAnyUnitEventBJ(wo,EVENT_PLAYER_UNIT_SPELL_EFFECT)
    call TriggerAddCondition(wo,Condition(function Fb))
    call TriggerAddAction(wo,function gb)
    set Wo=CreateTrigger()
    call TriggerRegisterPlayerChatEvent(Wo,Player(0),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(1),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(2),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(3),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(4),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(5),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(6),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(7),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(8),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player(9),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player($A),"-",false)
    call TriggerRegisterPlayerChatEvent(Wo,Player($B),"-",false)
    call TriggerAddCondition(Wo,Condition(function Hb))
    call TriggerAddAction(Wo,function lb)
    set yo=CreateTrigger()
    call TriggerAddAction(yo,function wb)
    set Yo=CreateTrigger()
    call TriggerAddAction(Yo,function yb)
    call ConditionalTriggerExecute(Zv)
endfunction

function config takes nothing returns nothing
    call SetMapName("가디언 스피리츠 택틱스 v1.33")
    call SetMapDescription("가디언 스피리츠의 세계에서 벌어지는 치열한 인맥 싸움에 여러분을 초대합니다!!")
    call SetPlayers($C)
    call SetTeams($C)
    call SetGamePlacement(MAP_PLACEMENT_TEAMS_TOGETHER)
    call DefineStartLocation(0,1280.,896.)
    call DefineStartLocation(1,512.,896.)
    call DefineStartLocation(2,-256.,896.)
    call DefineStartLocation(3,-1024.,896.)
    call DefineStartLocation(4,-1024.,128.)
    call DefineStartLocation(5,-1024.,-640.)
    call DefineStartLocation(6,-1024.,-1408.)
    call DefineStartLocation(7,-256.,-1408.)
    call DefineStartLocation(8,512.,-1408.)
    call DefineStartLocation(9,1280.,-1408.)
    call DefineStartLocation($A,1280.,-640.)
    call DefineStartLocation($B,1280.,128.)
    call SetPlayerStartLocation(Player(0),0)
    call ForcePlayerStartLocation(Player(0),0)
    call SetPlayerColor(Player(0),ConvertPlayerColor(0))
    call SetPlayerRacePreference(Player(0),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(0),false)
    call SetPlayerController(Player(0),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(1),1)
    call ForcePlayerStartLocation(Player(1),1)
    call SetPlayerColor(Player(1),ConvertPlayerColor(1))
    call SetPlayerRacePreference(Player(1),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(1),false)
    call SetPlayerController(Player(1),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(2),2)
    call ForcePlayerStartLocation(Player(2),2)
    call SetPlayerColor(Player(2),ConvertPlayerColor(2))
    call SetPlayerRacePreference(Player(2),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(2),false)
    call SetPlayerController(Player(2),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(3),3)
    call ForcePlayerStartLocation(Player(3),3)
    call SetPlayerColor(Player(3),ConvertPlayerColor(3))
    call SetPlayerRacePreference(Player(3),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(3),false)
    call SetPlayerController(Player(3),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(4),4)
    call ForcePlayerStartLocation(Player(4),4)
    call SetPlayerColor(Player(4),ConvertPlayerColor(4))
    call SetPlayerRacePreference(Player(4),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(4),false)
    call SetPlayerController(Player(4),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(5),5)
    call ForcePlayerStartLocation(Player(5),5)
    call SetPlayerColor(Player(5),ConvertPlayerColor(5))
    call SetPlayerRacePreference(Player(5),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(5),false)
    call SetPlayerController(Player(5),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(6),6)
    call ForcePlayerStartLocation(Player(6),6)
    call SetPlayerColor(Player(6),ConvertPlayerColor(6))
    call SetPlayerRacePreference(Player(6),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(6),false)
    call SetPlayerController(Player(6),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(7),7)
    call ForcePlayerStartLocation(Player(7),7)
    call SetPlayerColor(Player(7),ConvertPlayerColor(7))
    call SetPlayerRacePreference(Player(7),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(7),false)
    call SetPlayerController(Player(7),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(8),8)
    call ForcePlayerStartLocation(Player(8),8)
    call SetPlayerColor(Player(8),ConvertPlayerColor(8))
    call SetPlayerRacePreference(Player(8),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(8),false)
    call SetPlayerController(Player(8),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player(9),9)
    call ForcePlayerStartLocation(Player(9),9)
    call SetPlayerColor(Player(9),ConvertPlayerColor(9))
    call SetPlayerRacePreference(Player(9),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player(9),false)
    call SetPlayerController(Player(9),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player($A),$A)
    call ForcePlayerStartLocation(Player($A),$A)
    call SetPlayerColor(Player($A),ConvertPlayerColor($A))
    call SetPlayerRacePreference(Player($A),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player($A),false)
    call SetPlayerController(Player($A),MAP_CONTROL_USER)
    call SetPlayerStartLocation(Player($B),$B)
    call ForcePlayerStartLocation(Player($B),$B)
    call SetPlayerColor(Player($B),ConvertPlayerColor($B))
    call SetPlayerRacePreference(Player($B),RACE_PREF_HUMAN)
    call SetPlayerRaceSelectable(Player($B),false)
    call SetPlayerController(Player($B),MAP_CONTROL_USER)
    call InitCustomTeams()
    call SetStartLocPrioCount(0,2)
    call SetStartLocPrio(0,0,1,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(0,1,$B,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrioCount(1,3)
    call SetStartLocPrio(1,0,0,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(1,1,2,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(1,2,$B,MAP_LOC_PRIO_LOW)
    call SetStartLocPrioCount(2,3)
    call SetStartLocPrio(2,0,1,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(2,1,3,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(2,2,4,MAP_LOC_PRIO_LOW)
    call SetStartLocPrioCount(3,2)
    call SetStartLocPrio(3,0,2,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(3,1,4,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrioCount(4,3)
    call SetStartLocPrio(4,0,2,MAP_LOC_PRIO_LOW)
    call SetStartLocPrio(4,1,3,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(4,2,5,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrioCount(5,3)
    call SetStartLocPrio(5,0,4,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(5,1,6,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(5,2,7,MAP_LOC_PRIO_LOW)
    call SetStartLocPrioCount(6,2)
    call SetStartLocPrio(6,0,5,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(6,1,7,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrioCount(7,3)
    call SetStartLocPrio(7,0,5,MAP_LOC_PRIO_LOW)
    call SetStartLocPrio(7,1,6,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(7,2,8,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrioCount(8,3)
    call SetStartLocPrio(8,0,7,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(8,1,9,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(8,2,$A,MAP_LOC_PRIO_LOW)
    call SetStartLocPrioCount(9,2)
    call SetStartLocPrio(9,0,8,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio(9,1,$A,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrioCount($A,3)
    call SetStartLocPrio($A,0,8,MAP_LOC_PRIO_LOW)
    call SetStartLocPrio($A,1,9,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio($A,2,$B,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrioCount($B,3)
    call SetStartLocPrio($B,0,0,MAP_LOC_PRIO_HIGH)
    call SetStartLocPrio($B,1,1,MAP_LOC_PRIO_LOW)
    call SetStartLocPrio($B,2,$A,MAP_LOC_PRIO_HIGH)
endfunction
