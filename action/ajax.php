<?php
/* SPDX-License-Identifier: MIT
 * (c) 2026 Tatsuya Sawano
 */

if(!defined('DOKU_INC')) die();

class action_plugin_participants2_ajax extends DokuWiki_Action_Plugin {
    public function register(Doku_Event_Handler $controller){
        $controller->register_hook('AJAX_CALL_UNKNOWN', 'BEFORE', $this, 'handle');
    }

    public function handle(Doku_Event $event, $param){
        // 互換のため：旧 call=plugin_participants2_save も受け入れる
        if($event->data !== 'participants2' && $event->data !== 'plugin_participants2_save') return;

        $event->preventDefault();
        $event->stopPropagation();

        global $INPUT;

        // コマンド判定（互換：旧実装は cmd なし→ save として扱う）
        $cmd = $INPUT->str('cmd') ?: 'save';

        // ---- token: 最新CSRFトークンを返す（ここは checkSecurityToken しない）
        if ($cmd === 'token') {
            $this->respond(200, ['ok'=>true, 'sectok'=>getSecurityToken()]);
            return;
        }

        // パラメータ
        $page = cleanID($INPUT->str('page'));
        $name = trim($INPUT->str('name'));
        $status = $INPUT->str('status'); // 'present' | 'absent'
        $desc = $INPUT->str('description');

        // ---- load（参照系：トークン不要）
        if ($cmd === 'load') {
            if(!$page){ $this->respond(400, ['ok'=>false,'error'=>'bad_param']); return; }
            if(auth_quickaclcheck($page) < AUTH_READ){ $this->respond(403, ['ok'=>false,'error'=>'no_acl']); return; }

            /** @var helper_plugin_participants2_storage $store */
            $store = plugin_load('helper','participants2_storage');
            if(!$store){ $this->respond(500, ['ok'=>false,'error'=>'no_store']); return; }

            $rows = $store->load($page);
            $this->respond(200, ['ok'=>true, 'rows'=>$rows]);
            return;
        }

        // ---- save（書き込み系：ここでのみトークン検査）
        if ($cmd === 'save') {
            if(!checkSecurityToken()){
                $this->respond(403, ['ok'=>false,'error'=>'bad_token']);
                return;
            }

            if(!$page || !$name){
                $this->respond(400, ['ok'=>false,'error'=>'bad_param']);
                return;
            }

            if(!in_array($status, array('present','absent'), true)){
                $status = 'absent';
            }

            // ACL
            if(auth_quickaclcheck($page) < AUTH_EDIT){
                $this->respond(403, ['ok'=>false,'error'=>'no_acl']);
                return;
            }

            /** @var helper_plugin_participants2_storage $store */
            $store = plugin_load('helper','participants2_storage');
            if(!$store){
                $this->respond(500, ['ok'=>false,'error'=>'no_store']);
                return;
            }

            $rows = $store->load($page);
            if(!isset($rows[$name])) $rows[$name] = array('status'=>'absent','description'=>'');
            $rows[$name]['status'] = $status;
            $rows[$name]['description'] = (string)$desc;

            $ok = $store->save($page, $rows);
            $this->respond($ok ? 200 : 500, array('ok'=>!!$ok,'rows'=>$rows));
            return;
        }

        // 未知のコマンド
        $this->respond(400, ['ok'=>false,'error'=>'bad_cmd']);
    }

    private function respond($code, $payload){
        http_status($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    }
}
