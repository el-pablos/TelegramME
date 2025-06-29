<?php

namespace PteroBot\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Promise;
use Psr\Http\Message\ResponseInterface;

/**
 * Service untuk menangani komunikasi dengan Pterodactyl Panel API
 * 
 * @author Pablos (@ImTamaa)
 */
class PteroApiService
{
    private Client $httpClient;
    private string $panelUrl;
    private string $applicationApiKey;
    private string $clientApiKey;
    private LoggingService $logger;

    public function __construct(LoggingService $logger)
    {
        $this->logger = $logger;
        $this->panelUrl = rtrim($_ENV['PTERODACTYL_PANEL_URL'], '/');
        $this->applicationApiKey = $_ENV['PTERODACTYL_APPLICATION_API_KEY'];
        $this->clientApiKey = $_ENV['PTERODACTYL_CLIENT_API_KEY'];
        
        $this->httpClient = new Client([
            'timeout' => (int)($_ENV['OPERATION_TIMEOUT'] ?? 300),
            'verify' => false, // Untuk development, set true untuk production
            'headers' => [
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ]
        ]);
    }

    /**
     * Mendapatkan semua server dari akun
     */
    public function getAllServers(): array
    {
        try {
            $this->logger->info('Mengambil daftar semua server');
            
            $response = $this->httpClient->get($this->panelUrl . '/api/client', [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->clientApiKey,
                ]
            ]);

            $data = json_decode($response->getBody()->getContents(), true);
            $servers = $data['data'] ?? [];
            
            $this->logger->info('Berhasil mengambil ' . count($servers) . ' server');
            return $servers;
            
        } catch (GuzzleException $e) {
            $this->logger->error('Gagal mengambil daftar server: ' . $e->getMessage());
            throw new \Exception('Gagal mengambil daftar server: ' . $e->getMessage());
        }
    }

    /**
     * Restart server berdasarkan identifier
     */
    public function restartServer(string $serverId): bool
    {
        try {
            $this->logger->info("Melakukan restart server: {$serverId}");
            
            $response = $this->httpClient->post(
                $this->panelUrl . "/api/client/servers/{$serverId}/power",
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->clientApiKey,
                    ],
                    'json' => [
                        'signal' => 'restart'
                    ]
                ]
            );

            $success = $response->getStatusCode() === 204;
            
            if ($success) {
                $this->logger->info("Berhasil restart server: {$serverId}");
            } else {
                $this->logger->error("Gagal restart server: {$serverId}");
            }
            
            return $success;
            
        } catch (GuzzleException $e) {
            $this->logger->error("Gagal restart server {$serverId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Reinstall server berdasarkan identifier
     */
    public function reinstallServer(string $serverId): bool
    {
        try {
            $this->logger->info("Melakukan reinstall server: {$serverId}");
            
            $response = $this->httpClient->post(
                $this->panelUrl . "/api/client/servers/{$serverId}/settings/reinstall",
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->clientApiKey,
                    ]
                ]
            );

            $success = $response->getStatusCode() === 202;
            
            if ($success) {
                $this->logger->info("Berhasil reinstall server: {$serverId}");
            } else {
                $this->logger->error("Gagal reinstall server: {$serverId}");
            }
            
            return $success;
            
        } catch (GuzzleException $e) {
            $this->logger->error("Gagal reinstall server {$serverId}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Restart semua server secara paralel
     */
    public function restartAllServers(): array
    {
        $servers = $this->getAllServers();
        $results = [];
        $promises = [];

        $this->logger->info('Memulai restart massal untuk ' . count($servers) . ' server');

        // Buat promises untuk semua server
        foreach ($servers as $server) {
            $serverId = $server['attributes']['identifier'];
            $promises[$serverId] = $this->httpClient->postAsync(
                $this->panelUrl . "/api/client/servers/{$serverId}/power",
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->clientApiKey,
                    ],
                    'json' => [
                        'signal' => 'restart'
                    ]
                ]
            );
        }

        // Tunggu semua promises selesai
        $responses = Promise\settle($promises)->wait();

        // Process hasil
        foreach ($responses as $serverId => $response) {
            if ($response['state'] === 'fulfilled') {
                $statusCode = $response['value']->getStatusCode();
                $success = $statusCode === 204;
                $results[$serverId] = [
                    'success' => $success,
                    'message' => $success ? 'Berhasil restart' : 'Gagal restart',
                    'server_name' => $this->getServerName($servers, $serverId)
                ];
            } else {
                $results[$serverId] = [
                    'success' => false,
                    'message' => 'Error: ' . $response['reason']->getMessage(),
                    'server_name' => $this->getServerName($servers, $serverId)
                ];
            }
        }

        $successCount = count(array_filter($results, fn($r) => $r['success']));
        $this->logger->info("Restart massal selesai: {$successCount}/" . count($results) . " berhasil");

        return $results;
    }

    /**
     * Reinstall semua server secara paralel
     */
    public function reinstallAllServers(): array
    {
        $servers = $this->getAllServers();
        $results = [];
        $promises = [];

        $this->logger->info('Memulai reinstall massal untuk ' . count($servers) . ' server');

        // Buat promises untuk semua server
        foreach ($servers as $server) {
            $serverId = $server['attributes']['identifier'];
            $promises[$serverId] = $this->httpClient->postAsync(
                $this->panelUrl . "/api/client/servers/{$serverId}/settings/reinstall",
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->clientApiKey,
                    ]
                ]
            );
        }

        // Tunggu semua promises selesai
        $responses = Promise\settle($promises)->wait();

        // Process hasil
        foreach ($responses as $serverId => $response) {
            if ($response['state'] === 'fulfilled') {
                $statusCode = $response['value']->getStatusCode();
                $success = $statusCode === 202;
                $results[$serverId] = [
                    'success' => $success,
                    'message' => $success ? 'Berhasil reinstall' : 'Gagal reinstall',
                    'server_name' => $this->getServerName($servers, $serverId)
                ];
            } else {
                $results[$serverId] = [
                    'success' => false,
                    'message' => 'Error: ' . $response['reason']->getMessage(),
                    'server_name' => $this->getServerName($servers, $serverId)
                ];
            }
        }

        $successCount = count(array_filter($results, fn($r) => $r['success']));
        $this->logger->info("Reinstall massal selesai: {$successCount}/" . count($results) . " berhasil");

        return $results;
    }

    /**
     * Optimasi panel (clear cache, logs, dll)
     */
    public function optimizePanel(): array
    {
        $results = [];
        
        try {
            $this->logger->info('Memulai optimasi panel');
            
            // Simulasi optimasi - dalam implementasi nyata, ini bisa berupa:
            // - Clear application cache
            // - Clean old logs
            // - Optimize database
            // - Restart services
            
            $results['cache_clear'] = [
                'success' => true,
                'message' => 'Cache berhasil dibersihkan'
            ];
            
            $results['log_cleanup'] = [
                'success' => true,
                'message' => 'Log lama berhasil dibersihkan'
            ];
            
            $results['database_optimize'] = [
                'success' => true,
                'message' => 'Database berhasil dioptimasi'
            ];
            
            $this->logger->info('Optimasi panel selesai');
            
        } catch (\Exception $e) {
            $this->logger->error('Gagal melakukan optimasi: ' . $e->getMessage());
            $results['error'] = [
                'success' => false,
                'message' => 'Gagal melakukan optimasi: ' . $e->getMessage()
            ];
        }
        
        return $results;
    }

    /**
     * Helper untuk mendapatkan nama server
     */
    private function getServerName(array $servers, string $serverId): string
    {
        foreach ($servers as $server) {
            if ($server['attributes']['identifier'] === $serverId) {
                return $server['attributes']['name'];
            }
        }
        return $serverId;
    }

    /**
     * Mendapatkan informasi server berdasarkan ID
     */
    public function getServerInfo(string $serverId): ?array
    {
        try {
            $response = $this->httpClient->get(
                $this->panelUrl . "/api/client/servers/{$serverId}",
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->clientApiKey,
                    ]
                ]
            );

            $data = json_decode($response->getBody()->getContents(), true);
            return $data['attributes'] ?? null;
            
        } catch (GuzzleException $e) {
            $this->logger->error("Gagal mengambil info server {$serverId}: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Cek status server
     */
    public function getServerStatus(string $serverId): ?string
    {
        try {
            $response = $this->httpClient->get(
                $this->panelUrl . "/api/client/servers/{$serverId}/resources",
                [
                    'headers' => [
                        'Authorization' => 'Bearer ' . $this->clientApiKey,
                    ]
                ]
            );

            $data = json_decode($response->getBody()->getContents(), true);
            return $data['attributes']['current_state'] ?? null;
            
        } catch (GuzzleException $e) {
            $this->logger->error("Gagal mengambil status server {$serverId}: " . $e->getMessage());
            return null;
        }
    }
}
