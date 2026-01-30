<?php
/* SPDX-License-Identifier: MIT
 * (c) 2026 Tatsuya Sawano
 */

if(!defined('DOKU_INC')) die();

class action_plugin_participants2_cache extends DokuWiki_Action_Plugin {
    public function register(Doku_Event_Handler $controller){
        $controller->register_hook('PARSER_CACHE_USE', 'BEFORE', $this, 'onCacheUse');
    }

    public function onCacheUse(Doku_Event $event, $param){
        $cache = $event->data;
        if($cache->mode !== 'xhtml') return;

        $id = $cache->page;
        if(!$id) return;

        // Only if the page uses <participants2>
        $src = io_readFile(wikiFN($id), false);
        if(strpos($src, '<participants2>') === false) return;

        $file = metaFN($id, '.participants2.json');
        if(!isset($cache->depends['files'])) $cache->depends['files'] = [];
        $cache->depends['files'][] = $file;
    }
}
